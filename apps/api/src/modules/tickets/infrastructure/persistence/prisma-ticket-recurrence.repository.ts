import { Inject, Injectable } from '@nestjs/common';
import { TicketStatus } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketRecurrenceRepository,
  type AdvanceTicketRecurrenceInput,
  type DueTicketRecurrence,
  type TicketRecurrenceSource,
} from '../../application/ports/ticket-recurrence.repository';
import { enqueueTicketNotification } from '../outbox/enqueue-ticket-notification';

interface DueTicketRecurrenceRow {
  recurrence_id: number;
  template_ticket_id: number;
  source: TicketRecurrenceSource;
  recurrence_at: string;
  recurrence_rule: number;
  week_value: string | null;
}

interface LockedCanonicalRecurrenceRow {
  recurrence_id: number;
  template_ticket_id: number;
  cliente: number | null;
  pessoa: number | null;
  local_id: number | null;
  tipo: number | null;
  categoria: number | null;
  subcategoria: number | null;
  item: number | null;
  nivel: number | null;
  prioridade: number | null;
  forma: number | null;
  desc_abertura: string | null;
  recurrence_at: string;
  recurrence_rule: number;
  quantity_mode: 'fixa' | 'continua';
  quantity_total: number | null;
  remaining: number;
  week_value: string | null;
}

interface LockedLegacyRecurrenceRow {
  id: number;
  cliente: number | null;
  pessoa: number | null;
  local_id: number | null;
  tipo: number | null;
  categoria: number | null;
  subcategoria: number | null;
  item: number | null;
  nivel: number | null;
  prioridade: number | null;
  forma: number | null;
  desc_abertura: string | null;
  recurrence_at: string;
  recurrence_rule: number;
  remaining: number;
  week_value: string | null;
}

interface TicketTemplateData {
  cliente: number | null;
  pessoa: number | null;
  local_id: number | null;
  tipo: number | null;
  categoria: number | null;
  subcategoria: number | null;
  item: number | null;
  nivel: number | null;
  prioridade: number | null;
  forma: number | null;
  desc_abertura: string | null;
  recurrence_at: string;
  week_value: string | null;
}

type RecurrenceTransaction = Pick<
  Nivel3DatabaseClient,
  '$executeRawUnsafe' | '$queryRawUnsafe'
>;

interface LastInsertIdRow {
  id: number | bigint;
}

@Injectable()
export class PrismaTicketRecurrenceRepository extends TicketRecurrenceRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async findDue(limit: number): Promise<DueTicketRecurrence[]> {
    const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));

    const rows = await this.database.$queryRawUnsafe<DueTicketRecurrenceRow[]>(
      `SELECT *
       FROM (
         SELECT
           r.id AS recurrence_id,
           r.atendimento_modelo_id AS template_ticket_id,
           'canonical' AS source,
           DATE_FORMAT(r.proxima_reabertura, '%Y-%m-%d %H:%i:%s') AS recurrence_at,
           r.periodo AS recurrence_rule,
           CAST(a.semana AS CHAR) AS week_value
         FROM atendimento_recorrencias r
         INNER JOIN atendimentos a ON a.id = r.atendimento_modelo_id
         WHERE r.ativo = 1
           AND r.proxima_reabertura <= NOW()
           AND (
             r.quantidade_modo = 'continua'
             OR r.quantidade_restante > 0
           )

         UNION ALL

         SELECT
           a.id AS recurrence_id,
           a.id AS template_ticket_id,
           'legacy' AS source,
           DATE_FORMAT(a.data_recorrencia, '%Y-%m-%d %H:%i:%s') AS recurrence_at,
           a.vezes_reabrir AS recurrence_rule,
           CAST(a.semana AS CHAR) AS week_value
         FROM atendimentos a
         WHERE a.recorrente = 2
           AND a.data_recorrencia IS NOT NULL
           AND a.vezes > 0
           AND a.data_recorrencia <= NOW()
           AND NOT EXISTS (
             SELECT 1
             FROM atendimento_recorrencias r
             WHERE r.atendimento_modelo_id = a.id
           )
       ) due
       ORDER BY recurrence_at ASC, template_ticket_id ASC
       LIMIT ${safeLimit}`,
    );

    return rows.map((row) => ({
      recurrenceId: row.recurrence_id,
      templateTicketId: row.template_ticket_id,
      source: row.source,
      recurrenceAt: row.recurrence_at,
      recurrenceRule: row.recurrence_rule,
      week: row.week_value,
    }));
  }

  async advanceAndCreate(
    input: AdvanceTicketRecurrenceInput,
  ): Promise<boolean> {
    if (input.source === 'canonical') {
      return this.advanceCanonicalAndCreate(input);
    }

    return this.advanceLegacyAndCreate(input);
  }

  private async advanceCanonicalAndCreate(
    input: AdvanceTicketRecurrenceInput,
  ): Promise<boolean> {
    return this.database.$transaction(async (transaction) => {
      const rows =
        await transaction.$queryRawUnsafe<LockedCanonicalRecurrenceRow[]>(
          `SELECT
             r.id AS recurrence_id,
             r.atendimento_modelo_id AS template_ticket_id,
             a.cliente,
             a.pessoa,
             a.\`local\` AS local_id,
             a.tipo,
             a.categoria,
             a.subcategoria,
             a.item,
             a.nivel,
             a.prioridade,
             a.forma,
             a.desc_abertura,
             DATE_FORMAT(r.proxima_reabertura, '%Y-%m-%d %H:%i:%s') AS recurrence_at,
             r.periodo AS recurrence_rule,
             r.quantidade_modo AS quantity_mode,
             r.quantidade_total AS quantity_total,
             r.quantidade_restante AS remaining,
             CAST(a.semana AS CHAR) AS week_value
           FROM atendimento_recorrencias r
           INNER JOIN atendimentos a ON a.id = r.atendimento_modelo_id
           WHERE r.id = ?
             AND r.atendimento_modelo_id = ?
             AND r.ativo = 1
             AND r.proxima_reabertura = ?
             AND r.proxima_reabertura <= NOW()
             AND (
               r.quantidade_modo = 'continua'
               OR r.quantidade_restante > 0
             )
           LIMIT 1
           FOR UPDATE`,
          input.recurrenceId,
          input.templateTicketId,
          input.recurrenceAt,
        );

      const current = rows[0];

      if (!current) {
        return false;
      }

      const continuous = current.quantity_mode === 'continua';
      const remaining = continuous ? 999 : Math.max(0, current.remaining - 1);
      const active = continuous || remaining > 0 ? 1 : 0;

      const updated = await transaction.$executeRawUnsafe(
        `UPDATE atendimento_recorrencias
         SET proxima_reabertura = ?,
             quantidade_restante = ?,
             ativo = ?,
             atualizado_em = NOW()
         WHERE id = ?
           AND atendimento_modelo_id = ?
           AND ativo = 1
           AND proxima_reabertura = ?`,
        input.nextRecurrenceAt,
        remaining,
        active,
        input.recurrenceId,
        input.templateTicketId,
        input.recurrenceAt,
      );

      if (updated === 0) {
        return false;
      }

      await transaction.$executeRawUnsafe(
        `UPDATE atendimentos
         SET recorrente = 1,
             data_recorrencia = NULL,
             vezes_reabrir = 0,
             vezes = 0
         WHERE id = ?`,
        current.template_ticket_id,
      );

      await this.createTicketFromTemplate(transaction, current);
      return true;
    });
  }

  private async advanceLegacyAndCreate(
    input: AdvanceTicketRecurrenceInput,
  ): Promise<boolean> {
    return this.database.$transaction(async (transaction) => {
      const rows = await transaction.$queryRawUnsafe<LockedLegacyRecurrenceRow[]>(
        `SELECT
           id,
           cliente,
           pessoa,
           \`local\` AS local_id,
           tipo,
           categoria,
           subcategoria,
           item,
           nivel,
           prioridade,
           forma,
           desc_abertura,
           DATE_FORMAT(data_recorrencia, '%Y-%m-%d %H:%i:%s') AS recurrence_at,
           vezes_reabrir AS recurrence_rule,
           vezes AS remaining,
           CAST(semana AS CHAR) AS week_value
         FROM atendimentos
         WHERE id = ?
           AND recorrente = 2
           AND data_recorrencia = ?
           AND data_recorrencia IS NOT NULL
           AND data_recorrencia <= NOW()
           AND vezes > 0
           AND NOT EXISTS (
             SELECT 1
             FROM atendimento_recorrencias r
             WHERE r.atendimento_modelo_id = atendimentos.id
           )
         LIMIT 1
         FOR UPDATE`,
        input.templateTicketId,
        input.recurrenceAt,
      );

      const current = rows[0];

      if (!current) {
        return false;
      }

      const updated = await transaction.$executeRawUnsafe(
        `UPDATE atendimentos
         SET data_recorrencia = ?,
             vezes = vezes - 1
         WHERE id = ?
           AND recorrente = 2
           AND data_recorrencia = ?
           AND vezes > 0`,
        input.nextRecurrenceAt,
        input.templateTicketId,
        input.recurrenceAt,
      );

      if (updated === 0) {
        return false;
      }

      await this.createTicketFromTemplate(transaction, current);
      return true;
    });
  }

  private async createTicketFromTemplate(
    transaction: RecurrenceTransaction,
    template: TicketTemplateData,
  ): Promise<void> {
    await transaction.$executeRawUnsafe(
      `INSERT INTO atendimentos (
         cliente,
         pessoa,
         \`local\`,
         tipo,
         categoria,
         subcategoria,
         item,
         nivel,
         prioridade,
         forma,
         desc_abertura,
         abertura,
         tecnico,
         reincidente,
         status,
         recorrente,
         data_recorrencia,
         vezes_reabrir,
         vezes,
         semana
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 2, NULL, 0, 0, ?)`,
      template.cliente,
      template.pessoa,
      template.local_id,
      template.tipo,
      template.categoria,
      template.subcategoria,
      template.item,
      template.nivel,
      template.prioridade,
      template.forma,
      template.desc_abertura,
      template.recurrence_at,
      TicketStatus.Scheduled,
      template.week_value,
    );

    const insertedRows = await transaction.$queryRawUnsafe<LastInsertIdRow[]>(
      'SELECT LAST_INSERT_ID() AS id',
    );
    const newTicketId = Number(insertedRows[0]?.id);

    if (!Number.isSafeInteger(newTicketId) || newTicketId <= 0) {
      throw new Error(
        'Nao foi possivel identificar o atendimento criado pela recorrencia.',
      );
    }

    await transaction.$executeRawUnsafe(
      `INSERT INTO interatividade (
         inter_tipo,
         inter_atd,
         inter_user,
         inter_data,
         inter_desc
       )
       VALUES (1, ?, 1, ?, ?)`,
      newTicketId,
      template.recurrence_at,
      'Chamado aberto automaticamente conforme regra de recorrencia.',
    );

    await enqueueTicketNotification(transaction, 'ticket.opened', newTicketId, {
      actorUserId: 1,
      automatic: true,
      openingAt: template.recurrence_at.replace(' ', 'T'),
      status: TicketStatus.Scheduled,
    });
  }
}

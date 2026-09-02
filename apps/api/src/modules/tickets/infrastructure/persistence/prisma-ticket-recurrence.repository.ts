import { Inject, Injectable } from '@nestjs/common';
import { TicketStatus } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketRecurrenceRepository,
  type AdvanceTicketRecurrenceInput,
  type DueTicketRecurrence,
} from '../../application/ports/ticket-recurrence.repository';

interface DueTicketRecurrenceRow {
  ticket_id: number;
  recurrence_at: string;
  recurrence_rule: number;
  week_value: string | null;
}

interface LockedRecurrenceRow {
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
      `SELECT
         id AS ticket_id,
         DATE_FORMAT(data_recorrencia, '%Y-%m-%d %H:%i:%s') AS recurrence_at,
         vezes_reabrir AS recurrence_rule,
         CAST(semana AS CHAR) AS week_value
       FROM atendimentos
       WHERE recorrente = 2
         AND data_recorrencia IS NOT NULL
         AND vezes > 0
         AND data_recorrencia <= NOW()
       ORDER BY data_recorrencia ASC, id ASC
       LIMIT ${safeLimit}`,
    );

    return rows.map((row) => ({
      ticketId: row.ticket_id,
      recurrenceAt: row.recurrence_at,
      recurrenceRule: row.recurrence_rule,
      week: row.week_value,
    }));
  }

  async advanceAndCreate(
    input: AdvanceTicketRecurrenceInput,
  ): Promise<boolean> {
    return this.database.$transaction(async (transaction) => {
      const rows = await transaction.$queryRawUnsafe<LockedRecurrenceRow[]>(
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
         LIMIT 1
         FOR UPDATE`,
        input.ticketId,
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
        input.ticketId,
        input.recurrenceAt,
      );

      if (updated === 0) {
        return false;
      }

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
        current.cliente,
        current.pessoa,
        current.local_id,
        current.tipo,
        current.categoria,
        current.subcategoria,
        current.item,
        current.nivel,
        current.prioridade,
        current.forma,
        current.desc_abertura,
        current.recurrence_at,
        TicketStatus.Scheduled,
        current.week_value,
      );

      const insertedRows =
        await transaction.$queryRawUnsafe<LastInsertIdRow[]>(
          'SELECT LAST_INSERT_ID() AS id',
        );
      const newTicketId = Number(insertedRows[0]?.id);

      if (!Number.isSafeInteger(newTicketId) || newTicketId <= 0) {
        throw new Error(
          `Nao foi possivel identificar o atendimento recorrente criado a partir de ${input.ticketId}.`,
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
        current.recurrence_at,
        'Chamado aberto automaticamente conforme regra de recorrencia.',
      );

      return true;
    });
  }
}

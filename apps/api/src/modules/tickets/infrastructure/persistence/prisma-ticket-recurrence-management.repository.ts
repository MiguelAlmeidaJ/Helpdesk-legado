import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  TicketRecurrenceClientOption,
  TicketRecurrenceItem,
  TicketRecurrenceMutationRequest,
  TicketRecurrenceMutationResponse,
  TicketRecurrencePeriod,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import { calculateNextTicketRecurrence } from '../../domain/calculate-next-ticket-recurrence';
import {
  TicketRecurrenceManagementRepository,
  type TicketRecurrenceManagementListQuery,
} from '../../application/ports/ticket-recurrence-management.repository';

type DatabaseInteger = number | bigint;

interface VisibilityRow { tipo_usuario: DatabaseInteger; }
interface ClientScopeRow { cliente_id: DatabaseInteger; }
interface ClientRow { id: DatabaseInteger; name: string; }
interface LastInsertIdRow { id: DatabaseInteger; }
interface RecurrenceRow {
  id: DatabaseInteger;
  model_ticket_id: DatabaseInteger;
  name: string;
  client_id: DatabaseInteger;
  client_name: string;
  period: DatabaseInteger;
  next_at: string;
  quantity_mode: 'fixa' | 'continua';
  quantity_total: DatabaseInteger | null;
  quantity_remaining: DatabaseInteger;
  active: DatabaseInteger | boolean;
  week_value: DatabaseInteger | null;
}
interface LockedRecurrenceRow {
  id: DatabaseInteger;
  model_ticket_id: DatabaseInteger;
  client_id: DatabaseInteger;
  period: DatabaseInteger;
  next_at: string;
  quantity_mode: 'fixa' | 'continua';
  quantity_total: DatabaseInteger | null;
  quantity_remaining: DatabaseInteger;
  week_value: DatabaseInteger | null;
}
interface Visibility { restrictClients: boolean; clientIds: number[]; }

const PERIOD_LABELS: Record<number, string> = {
  1: 'Diário', 2: 'Mensal', 3: 'A cada 3 meses', 4: 'A cada 6 meses',
  5: 'Anual', 6: 'Semanal', 7: 'Mesmo dia/semana do mês', 8: 'Dias úteis',
};

@Injectable()
export class PrismaTicketRecurrenceManagementRepository extends TicketRecurrenceManagementRepository {
  constructor(@Inject(NIVEL3_DATABASE) private readonly database: Nivel3DatabaseClient) { super(); }

  async list(query: TicketRecurrenceManagementListQuery): Promise<TicketRecurrenceItem[]> {
    const visibility = await this.resolveVisibility(query.userId);
    if (visibility.restrictClients && visibility.clientIds.length === 0) return [];

    const where: string[] = ['1 = 1'];
    const params: unknown[] = [];
    if (query.clientId) { where.push('r.cliente_id = ?'); params.push(query.clientId); }
    if (query.period) { where.push('r.periodo = ?'); params.push(query.period); }
    if (query.status === 'ativas') where.push('r.ativo = 1');
    if (query.status === 'inativas') where.push('r.ativo = 0');
    if (visibility.restrictClients) {
      where.push(`r.cliente_id IN (${visibility.clientIds.map(() => '?').join(', ')})`);
      params.push(...visibility.clientIds);
    }

    const rows = await this.database.$queryRawUnsafe<RecurrenceRow[]>(
      `SELECT r.id,
              r.atendimento_modelo_id AS model_ticket_id,
              r.nome AS name,
              r.cliente_id AS client_id,
              COALESCE(c.clt_nomef, c.clt_nomer, CONCAT('Cliente #', r.cliente_id)) AS client_name,
              r.periodo AS period,
              DATE_FORMAT(r.proxima_reabertura, '%Y-%m-%dT%H:%i') AS next_at,
              r.quantidade_modo AS quantity_mode,
              r.quantidade_total AS quantity_total,
              r.quantidade_restante AS quantity_remaining,
              r.ativo AS active,
              a.semana AS week_value
       FROM atendimento_recorrencias r
       INNER JOIN atendimentos a ON a.id = r.atendimento_modelo_id
       INNER JOIN clientes c ON c.clt_id = r.cliente_id
       WHERE ${where.join(' AND ')}
       ORDER BY r.ativo DESC, r.proxima_reabertura ASC, r.nome ASC`,
      ...params,
    );

    return rows.map((row) => {
      const period = Number(row.period) as TicketRecurrencePeriod;

      return {
        id: Number(row.id),
        modelTicketId: Number(row.model_ticket_id),
        name: row.name,
        clientId: Number(row.client_id),
        clientName: row.client_name,
        period,
        periodLabel: PERIOD_LABELS[period] ?? 'Não definido',
        nextAt: row.next_at,
        quantityMode: row.quantity_mode,
        quantityTotal: row.quantity_total === null ? null : Number(row.quantity_total),
        quantityRemaining: Number(row.quantity_remaining),
        active: Boolean(row.active),
        week: row.week_value === null ? null : Number(row.week_value),
      };
    });
  }

  async clients(userId: number): Promise<TicketRecurrenceClientOption[]> {
    const visibility = await this.resolveVisibility(userId);
    if (visibility.restrictClients && visibility.clientIds.length === 0) return [];
    const params: unknown[] = [];
    let scope = '';
    if (visibility.restrictClients) {
      scope = ` AND c.clt_id IN (${visibility.clientIds.map(() => '?').join(', ')})`;
      params.push(...visibility.clientIds);
    }
    const rows = await this.database.$queryRawUnsafe<ClientRow[]>(
      `SELECT c.clt_id AS id, COALESCE(c.clt_nomef, c.clt_nomer, CONCAT('Cliente #', c.clt_id)) AS name
       FROM clientes c
       WHERE c.clt_sts = 1${scope}
       ORDER BY name ASC`, ...params,
    );
    return rows.map((row) => ({ id: Number(row.id), name: row.name }));
  }

  async create(userId: number, input: TicketRecurrenceMutationRequest): Promise<TicketRecurrenceMutationResponse> {
    await this.assertClientAllowed(userId, input.clientId);
    const week = this.weekOfMonth(input.nextAt);
    const total = input.quantityMode === 'continua' ? null : input.quantity ?? 1;
    const remaining = input.quantityMode === 'continua' ? 999 : total;

    return this.database.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO atendimentos
           (cliente, tipo, nivel, prioridade, forma, desc_abertura, abertura, tecnico,
            reincidente, status, recorrente, data_recorrencia, vezes_reabrir, vezes, semana)
         VALUES (?, 7, 1, 1, 1, ?, NULL, 0, 0, -1, 1, NULL, 0, 0, ?)`,
        input.clientId, input.name, week,
      );
      const inserted = await tx.$queryRawUnsafe<LastInsertIdRow[]>('SELECT LAST_INSERT_ID() AS id');
      const modelTicketId = Number(inserted[0]?.id);
      await tx.$executeRawUnsafe(
        `INSERT INTO atendimento_recorrencias
           (atendimento_modelo_id, nome, cliente_id, periodo, proxima_reabertura,
            quantidade_modo, quantidade_total, quantidade_restante, ativo, criado_por, atualizado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        modelTicketId, input.name, input.clientId, input.period, this.sqlDateTime(input.nextAt),
        input.quantityMode, total, remaining, userId, userId,
      );
      const recurrence = await tx.$queryRawUnsafe<LastInsertIdRow[]>('SELECT LAST_INSERT_ID() AS id');
      return { id: Number(recurrence[0]?.id), modelTicketId };
    });
  }

  async update(userId: number, recurrenceId: number, input: TicketRecurrenceMutationRequest): Promise<void> {
    await this.assertClientAllowed(userId, input.clientId);
    const total = input.quantityMode === 'continua' ? null : input.quantity ?? 1;
    const remaining = input.quantityMode === 'continua' ? 999 : total;
    const week = this.weekOfMonth(input.nextAt);

    await this.database.$transaction(async (tx) => {
      const current = await tx.$queryRawUnsafe<Array<{ model_ticket_id: DatabaseInteger; client_id: DatabaseInteger }>>(
        `SELECT atendimento_modelo_id AS model_ticket_id, cliente_id AS client_id
         FROM atendimento_recorrencias WHERE id = ? LIMIT 1 FOR UPDATE`, recurrenceId,
      );
      if (!current[0]) throw new NotFoundException('Recorrência não encontrada.');
      const currentClientId = Number(current[0].client_id);
      const modelTicketId = Number(current[0].model_ticket_id);
      await this.assertClientAllowed(userId, currentClientId);
      await tx.$executeRawUnsafe(
        `UPDATE atendimento_recorrencias
         SET nome = ?, cliente_id = ?, periodo = ?, proxima_reabertura = ?, quantidade_modo = ?,
             quantidade_total = ?, quantidade_restante = ?, atualizado_por = ?, atualizado_em = NOW()
         WHERE id = ?`,
        input.name, input.clientId, input.period, this.sqlDateTime(input.nextAt), input.quantityMode,
        total, remaining, userId, recurrenceId,
      );
      await tx.$executeRawUnsafe(
        `UPDATE atendimentos
         SET cliente = ?, desc_abertura = ?, semana = ?, recorrente = 1,
             data_recorrencia = NULL, vezes_reabrir = 0, vezes = 0
         WHERE id = ?`,
        input.clientId, input.name, week, modelTicketId,
      );
    });
  }

  async setActive(userId: number, recurrenceId: number, active: boolean): Promise<void> {
    await this.database.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<LockedRecurrenceRow[]>(
        `SELECT r.id, r.atendimento_modelo_id AS model_ticket_id, r.cliente_id AS client_id,
                r.periodo AS period, DATE_FORMAT(r.proxima_reabertura, '%Y-%m-%d %H:%i:%s') AS next_at,
                r.quantidade_modo AS quantity_mode, r.quantidade_total AS quantity_total,
                r.quantidade_restante AS quantity_remaining, a.semana AS week_value
         FROM atendimento_recorrencias r
         INNER JOIN atendimentos a ON a.id = r.atendimento_modelo_id
         WHERE r.id = ? LIMIT 1 FOR UPDATE`, recurrenceId,
      );
      const row = rows[0];
      if (!row) throw new NotFoundException('Recorrência não encontrada.');
      const clientId = Number(row.client_id);
      const modelTicketId = Number(row.model_ticket_id);
      const period = Number(row.period) as TicketRecurrencePeriod;
      await this.assertClientAllowed(userId, clientId);

      let nextAt = row.next_at;
      if (active && new Date(nextAt.replace(' ', 'T')).getTime() <= Date.now()) {
        nextAt = calculateNextTicketRecurrence(nextAt, period, row.week_value === null ? null : String(Number(row.week_value)))
          ?? this.tomorrowAtSameTime(nextAt);
      }
      let remaining = Number(row.quantity_remaining);
      if (active && row.quantity_mode === 'fixa' && remaining <= 0) remaining = Math.max(1, Number(row.quantity_total ?? 1));
      if (row.quantity_mode === 'continua') remaining = 999;

      await tx.$executeRawUnsafe(
        `UPDATE atendimento_recorrencias
         SET ativo = ?, proxima_reabertura = ?, quantidade_restante = ?, atualizado_por = ?, atualizado_em = NOW()
         WHERE id = ?`, active ? 1 : 0, nextAt, remaining, userId, recurrenceId,
      );
      await tx.$executeRawUnsafe(
        `UPDATE atendimentos SET recorrente = 1, data_recorrencia = NULL, vezes_reabrir = 0, vezes = 0 WHERE id = ?`,
        modelTicketId,
      );
    });
  }

  private async resolveVisibility(userId: number): Promise<Visibility> {
    const rows = await this.database.$queryRawUnsafe<VisibilityRow[]>('SELECT tipo_usuario FROM usuarios WHERE user_id = ? LIMIT 1', userId);
    if (Number(rows[0]?.tipo_usuario) !== 2) return { restrictClients: false, clientIds: [] };
    const clients = await this.database.$queryRawUnsafe<ClientScopeRow[]>('SELECT cliente_id FROM clientes_usuarios WHERE usuario_id = ?', userId);
    return { restrictClients: true, clientIds: [...new Set(clients.map((row) => Number(row.cliente_id)).filter((id) => id > 0))] };
  }

  private async assertClientAllowed(userId: number, clientId: number): Promise<void> {
    const visibility = await this.resolveVisibility(userId);
    if (visibility.restrictClients && !visibility.clientIds.includes(clientId)) throw new ForbiddenException('Cliente fora do escopo do usuário.');
    const rows = await this.database.$queryRawUnsafe<Array<{ ok: number }>>('SELECT 1 AS ok FROM clientes WHERE clt_id = ? AND clt_sts = 1 LIMIT 1', clientId);
    if (!rows[0]) throw new NotFoundException('Cliente ativo não encontrado.');
  }

  private weekOfMonth(nextAt: string): number {
    const day = Number(nextAt.slice(8, 10));
    return Math.max(1, Math.min(5, Math.ceil(day / 7)));
  }

  private sqlDateTime(value: string): string { return `${value.replace('T', ' ')}:00`; }

  private tomorrowAtSameTime(value: string): string {
    const source = new Date(value.replace(' ', 'T'));
    source.setDate(source.getDate() + 1);
    const two = (part: number) => String(part).padStart(2, '0');
    return `${source.getFullYear()}-${two(source.getMonth() + 1)}-${two(source.getDate())} ${two(source.getHours())}:${two(source.getMinutes())}:${two(source.getSeconds())}`;
  }
}

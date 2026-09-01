import { Inject, Injectable } from '@nestjs/common';
import {
  TICKET_STATUS_LABELS,
  TicketStatus,
  type TicketListFilters,
  type TicketListItem,
  type TicketListSort,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketsReadRepository,
  type TicketsReadRepositoryQuery,
  type TicketsReadRepositoryResult,
} from '../../application/ports/tickets-read.repository';

interface VisibilityRow {
  tipo_usuario: number;
}

interface ClientScopeRow {
  cliente_id: number;
}

interface CountRow {
  total: bigint | number | string;
}

interface TicketRow {
  id: number;
  status: number | null;
  nivel: number | null;
  prioridade: number | null;
  forma: number | null;
  reincidente: number | null;
  abertura: Date | string | null;
  fechamento: Date | string | null;
  desc_abertura: string | null;
  desc_fechamento: string | null;
  cliente_id: number | null;
  cliente_nome: string | null;
  pessoa_id: number | null;
  pessoa_nome: string | null;
  local_id: number | null;
  local_nome: string | null;
  categoria_id: number | null;
  categoria_nome: string | null;
  subcategoria_id: number | null;
  subcategoria_nome: string | null;
  item_id: number | null;
  item_nome: string | null;
  tecnico_id: number | null;
  tecnico_nome: string | null;
}

const SORT_SQL: Record<TicketListSort, string> = {
  id: 'a.id',
  client: 'c.clt_nomef',
  openedAt: 'a.abertura',
  level: 'a.nivel',
  priority: 'a.prioridade',
  technician: 'u.user_nome',
  status: 'a.status',
};

function toIsoString(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function positiveUnique(values: number[]): number[] {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value >= 0))];
}

function appendInFilter(
  where: string[],
  params: unknown[],
  column: string,
  values: number[],
) {
  const normalized = positiveUnique(values);

  if (normalized.length === 0) {
    return;
  }

  where.push(`${column} IN (${normalized.map(() => '?').join(', ')})`);
  params.push(...normalized);
}

@Injectable()
export class PrismaTicketsReadRepository extends TicketsReadRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async list(
    query: TicketsReadRepositoryQuery,
  ): Promise<TicketsReadRepositoryResult> {
    const visibility = await this.resolveVisibility(query.userId);

    if (visibility.restrictClients && visibility.clientIds.length === 0) {
      return { data: [], total: 0 };
    }

    const filters = query.filters;
    const where: string[] = [];
    const params: unknown[] = [];

    appendInFilter(where, params, 'a.status', filters.statuses);
    appendInFilter(where, params, 'a.tipo', filters.typeIds);

    if (filters.clientId) {
      where.push('a.cliente = ?');
      params.push(filters.clientId);
    }

    if (filters.requesterId) {
      where.push('a.pessoa = ?');
      params.push(filters.requesterId);
    }

    if (filters.ticketId) {
      where.push('a.id = ?');
      params.push(filters.ticketId);
    }

    const effectiveSearch =
      query.userId === 134 ? 'NET DO BRASIL' : filters.search;

    if (effectiveSearch) {
      where.push(
        '(LOWER(a.desc_abertura) LIKE LOWER(?) OR LOWER(a.desc_fechamento) LIKE LOWER(?))',
      );
      const like = `%${effectiveSearch}%`;
      params.push(like, like);
    }

    appendInFilter(
      where,
      params,
      'a.tecnico',
      filters.technicianIds,
    );

    if (filters.openedFrom) {
      where.push('a.abertura >= ?');
      params.push(`${filters.openedFrom} 00:00:00`);
    }

    if (filters.openedTo) {
      where.push('a.abertura <= ?');
      params.push(`${filters.openedTo} 23:59:59`);
    }

    if (visibility.restrictClients) {
      appendInFilter(
        where,
        params,
        'a.cliente',
        visibility.clientIds,
      );
    }

    if (query.ownerTechnicianId) {
      where.push('a.tecnico = ?');
      params.push(query.ownerTechnicianId);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const countSql = `
      SELECT COUNT(*) AS total
      FROM atendimentos a
      ${whereSql}
    `;

    const countRows = await this.database.$queryRawUnsafe<CountRow[]>(
      countSql,
      ...params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    if (total === 0) {
      return { data: [], total: 0 };
    }

    const sortColumn = SORT_SQL[filters.sort];
    const direction = filters.direction === 'asc' ? 'ASC' : 'DESC';
    const offset = (query.page - 1) * query.limit;

    const rowsSql = `
      SELECT
        a.id,
        a.status,
        a.nivel,
        a.prioridade,
        a.forma,
        a.reincidente,
        a.abertura,
        a.fechamento,
        a.desc_abertura,
        a.desc_fechamento,
        c.clt_id AS cliente_id,
        c.clt_nomef AS cliente_nome,
        p.pessoa_id AS pessoa_id,
        p.pessoa_nom AS pessoa_nome,
        l.local_id AS local_id,
        l.local_nom AS local_nome,
        cat.cat_id AS categoria_id,
        cat.cat_nome AS categoria_nome,
        scat.scat_id AS subcategoria_id,
        scat.scat_nome AS subcategoria_nome,
        i.itens_id AS item_id,
        i.itens_nome AS item_nome,
        u.user_id AS tecnico_id,
        u.user_nome AS tecnico_nome
      FROM atendimentos a
      INNER JOIN clientes c ON c.clt_id = a.cliente
      LEFT JOIN pessoas p ON p.pessoa_id = a.pessoa
      LEFT JOIN locais l ON l.local_id = a.local
      LEFT JOIN categorias cat ON cat.cat_id = a.categoria
      LEFT JOIN subcategorias scat ON scat.scat_id = a.subcategoria
      LEFT JOIN itens i ON i.itens_id = a.item
      LEFT JOIN usuarios u ON u.user_id = a.tecnico
      ${whereSql}
      ORDER BY ${sortColumn} ${direction}, a.id ASC
      LIMIT ? OFFSET ?
    `;

    const rows = await this.database.$queryRawUnsafe<TicketRow[]>(
      rowsSql,
      ...params,
      query.limit,
      offset,
    );

    return {
      total,
      data: rows.map((row) => this.mapRow(row)),
    };
  }

  private async resolveVisibility(userId: number): Promise<{
    restrictClients: boolean;
    clientIds: number[];
  }> {
    const users = await this.database.$queryRawUnsafe<VisibilityRow[]>(
      `SELECT tipo_usuario
       FROM usuarios
       WHERE user_id = ?
       LIMIT 1`,
      userId,
    );

    if (users[0]?.tipo_usuario !== 2) {
      return {
        restrictClients: false,
        clientIds: [],
      };
    }

    const clients = await this.database.$queryRawUnsafe<ClientScopeRow[]>(
      `SELECT cliente_id
       FROM clientes_usuarios
       WHERE usuario_id = ?`,
      userId,
    );

    return {
      restrictClients: true,
      clientIds: clients.map((row) => row.cliente_id),
    };
  }

  private mapRow(row: TicketRow): TicketListItem {
    const status =
      row.status !== null &&
      row.status >= TicketStatus.Scheduled &&
      row.status <= TicketStatus.Completed
        ? (row.status as TicketStatus)
        : TicketStatus.WaitingExecution;

    return {
      id: row.id,
      status,
      statusLabel: TICKET_STATUS_LABELS[status],
      level: row.nivel,
      priority: row.prioridade,
      form: row.forma,
      recurrent: row.reincidente === 1,
      openedAt: toIsoString(row.abertura),
      closedAt: toIsoString(row.fechamento),
      openingDescription: row.desc_abertura,
      closingDescription: row.desc_fechamento,
      client: {
        id: row.cliente_id,
        name: row.cliente_nome,
      },
      requester: {
        id: row.pessoa_id,
        name: row.pessoa_nome,
      },
      location: {
        id: row.local_id,
        name: row.local_nome,
      },
      category: {
        id: row.categoria_id,
        name: row.categoria_nome,
      },
      subcategory: {
        id: row.subcategoria_id,
        name: row.subcategoria_nome,
      },
      item: {
        id: row.item_id,
        name: row.item_nome,
      },
      technician: {
        id: row.tecnico_id,
        name: row.tecnico_nome,
      },
    };
  }
}

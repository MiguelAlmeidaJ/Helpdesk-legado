import { Inject, Injectable } from '@nestjs/common';
import {
  TICKET_STATUS_LABELS,
  TicketStatus,
  type ImprovementFilterOption,
  type ImprovementFilterOptions,
  type ImprovementListItem,
  type ImprovementListSort,
  type ImprovementStatusCard,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import {
  ImprovementReadRepository,
  type ImprovementReadRepositoryQuery,
  type ImprovementReadRepositoryResult,
} from '../application/ports/improvement-read.repository';

interface VisibilityRow {
  tipo_usuario: number;
}

interface ClientScopeRow {
  cliente_id: number;
}

interface CountRow {
  total: bigint | number | string;
}

interface StatusCardsRow {
  waiting: bigint | number | string;
  in_progress: bigint | number | string;
  on_hold: bigint | number | string;
  completed: bigint | number | string;
  finished: bigint | number | string;
  scheduled: bigint | number | string;
  all_open: bigint | number | string;
}

interface OptionRow {
  id: number;
  name: string;
}

interface ImprovementRow {
  id: number;
  status: number | null;
  tipo: number | null;
  nivel: number | null;
  forma: number | null;
  reincidente: number | null;
  recorrente: number | null;
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

interface Visibility {
  restrictClients: boolean;
  clientIds: number[];
}

interface BuiltWhere {
  sql: string;
  params: unknown[];
}

const SORT_SQL: Record<ImprovementListSort, string> = {
  id: 'm.id',
  client: 'c.clt_nomef',
  openedAt: 'm.abertura',
  level: 'm.nivel',
  form: 'm.forma',
  technician: 'u.user_nome',
  status: 'm.status',
};

const ALL_STATUSES = [
  TicketStatus.Scheduled,
  TicketStatus.WaitingExecution,
  TicketStatus.InProgress,
  TicketStatus.OnHold,
  TicketStatus.Finished,
  TicketStatus.Completed,
];

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

function nonNegativeUnique(values: number[]): number[] {
  return [
    ...new Set(
      values.filter((value) => Number.isInteger(value) && value >= 0),
    ),
  ];
}

function appendInFilter(
  where: string[],
  params: unknown[],
  column: string,
  values: number[],
) {
  const normalized = nonNegativeUnique(values);

  if (normalized.length === 0) {
    return;
  }

  where.push(`${column} IN (${normalized.map(() => '?').join(', ')})`);
  params.push(...normalized);
}

@Injectable()
export class PrismaImprovementReadRepository extends ImprovementReadRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async list(
    query: ImprovementReadRepositoryQuery,
  ): Promise<ImprovementReadRepositoryResult> {
    const visibility = await this.resolveVisibility(query.userId);

    if (visibility.restrictClients && visibility.clientIds.length === 0) {
      return {
        data: [],
        total: 0,
        statusCards: this.emptyStatusCards(),
        options: {
          clients: [],
          requesters: [],
          technicians: await this.fetchTechnicians(),
        },
      };
    }

    const listWhere = this.buildWhere(query, visibility);
    const cardWhere = this.buildWhere(
      {
        ...query,
        filters: {
          ...query.filters,
          statuses: ALL_STATUSES,
        },
      },
      visibility,
    );

    const [countRows, statusCards, options] = await Promise.all([
      this.database.$queryRawUnsafe<CountRow[]>(
        `SELECT COUNT(*) AS total
         FROM melhorias m
         ${listWhere.sql}`,
        ...listWhere.params,
      ),
      this.fetchStatusCards(cardWhere),
      this.fetchOptions(query.filters.clientId, visibility),
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    if (total === 0) {
      return {
        data: [],
        total,
        statusCards,
        options,
      };
    }

    const direction = query.filters.direction === 'desc' ? 'DESC' : 'ASC';
    const sortColumn = SORT_SQL[query.filters.sort];
    const offset = (query.page - 1) * query.limit;

    const rows = await this.database.$queryRawUnsafe<ImprovementRow[]>(
      `
      SELECT
        m.id,
        m.status,
        m.tipo,
        m.nivel,
        m.forma,
        m.reincidente,
        m.recorrente,
        m.abertura,
        m.fechamento,
        m.desc_abertura,
        m.desc_fechamento,
        c.clt_id AS cliente_id,
        c.clt_nomef AS cliente_nome,
        p.pessoa_id AS pessoa_id,
        p.pessoa_nom AS pessoa_nome,
        m.local AS local_id,
        l.local_nom AS local_nome,
        cat.cat_id AS categoria_id,
        cat.cat_nome AS categoria_nome,
        scat.scat_id AS subcategoria_id,
        scat.scat_nome AS subcategoria_nome,
        i.itens_id AS item_id,
        i.itens_nome AS item_nome,
        m.tecnico AS tecnico_id,
        u.user_nome AS tecnico_nome
      FROM melhorias m
      INNER JOIN clientes c ON c.clt_id = m.cliente
      LEFT JOIN pessoas p ON p.pessoa_id = m.pessoa
      LEFT JOIN locais l ON l.local_id = m.local
      LEFT JOIN categorias cat ON cat.cat_id = m.categoria
      LEFT JOIN subcategorias scat ON scat.scat_id = m.subcategoria
      LEFT JOIN itens i ON i.itens_id = m.item
      LEFT JOIN usuarios u ON u.user_id = m.tecnico
      ${listWhere.sql}
      ORDER BY ${sortColumn} ${direction}, m.id ASC
      LIMIT ? OFFSET ?
      `,
      ...listWhere.params,
      query.limit,
      offset,
    );

    return {
      data: rows.map((row) => this.mapRow(row)),
      total,
      statusCards,
      options,
    };
  }

  private buildWhere(
    query: ImprovementReadRepositoryQuery,
    visibility: Visibility,
  ): BuiltWhere {
    const filters = query.filters;
    const where: string[] = [];
    const params: unknown[] = [];

    appendInFilter(where, params, 'm.status', filters.statuses);

    if (filters.clientId) {
      where.push('m.cliente = ?');
      params.push(filters.clientId);
    }

    if (filters.requesterId) {
      where.push('m.pessoa = ?');
      params.push(filters.requesterId);
    }

    if (filters.improvementId) {
      where.push('m.id = ?');
      params.push(filters.improvementId);
    }

    appendInFilter(where, params, 'm.tecnico', filters.technicianIds);

    if (filters.openedFrom) {
      where.push('m.abertura >= ?');
      params.push(`${filters.openedFrom} 00:00:00`);
    }

    if (filters.openedTo) {
      where.push('m.abertura <= ?');
      params.push(`${filters.openedTo} 23:59:59`);
    }

    if (visibility.restrictClients) {
      appendInFilter(where, params, 'm.cliente', visibility.clientIds);
    }

    if (query.ownerTechnicianId) {
      where.push('m.tecnico = ?');
      params.push(query.ownerTechnicianId);
    }

    return {
      sql: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '',
      params,
    };
  }

  private async fetchStatusCards(
    where: BuiltWhere,
  ): Promise<ImprovementStatusCard[]> {
    const rows = await this.database.$queryRawUnsafe<StatusCardsRow[]>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN m.status = 1 THEN 1 ELSE 0 END), 0) AS waiting,
        COALESCE(SUM(CASE WHEN m.status = 2 THEN 1 ELSE 0 END), 0) AS in_progress,
        COALESCE(SUM(CASE WHEN m.status = 3 THEN 1 ELSE 0 END), 0) AS on_hold,
        COALESCE(SUM(CASE WHEN m.status = 5 THEN 1 ELSE 0 END), 0) AS completed,
        COALESCE(SUM(CASE WHEN m.status = 4 THEN 1 ELSE 0 END), 0) AS finished,
        COALESCE(SUM(CASE WHEN m.status = 0 THEN 1 ELSE 0 END), 0) AS scheduled,
        COALESCE(SUM(CASE WHEN m.status IN (0, 1, 2, 3, 4) THEN 1 ELSE 0 END), 0) AS all_open
      FROM melhorias m
      ${where.sql}
      `,
      ...where.params,
    );

    const row = rows[0];
    if (!row) {
      return this.emptyStatusCards();
    }

    return [
      {
        key: 'waiting',
        label: 'Aguardando',
        statuses: [TicketStatus.WaitingExecution],
        total: Number(row.waiting),
      },
      {
        key: 'inProgress',
        label: 'Em execução',
        statuses: [TicketStatus.InProgress],
        total: Number(row.in_progress),
      },
      {
        key: 'onHold',
        label: 'Em espera',
        statuses: [TicketStatus.OnHold],
        total: Number(row.on_hold),
      },
      {
        key: 'completed',
        label: 'Concluído',
        statuses: [TicketStatus.Completed],
        total: Number(row.completed),
      },
      {
        key: 'finished',
        label: 'Finalizado',
        statuses: [TicketStatus.Finished],
        total: Number(row.finished),
      },
      {
        key: 'scheduled',
        label: 'Agendados',
        statuses: [TicketStatus.Scheduled],
        total: Number(row.scheduled),
      },
      {
        key: 'all',
        label: 'Todos',
        statuses: [
          TicketStatus.Scheduled,
          TicketStatus.WaitingExecution,
          TicketStatus.InProgress,
          TicketStatus.OnHold,
          TicketStatus.Finished,
        ],
        total: Number(row.all_open),
      },
    ];
  }

  private emptyStatusCards(): ImprovementStatusCard[] {
    return [
      {
        key: 'waiting',
        label: 'Aguardando',
        statuses: [TicketStatus.WaitingExecution],
        total: 0,
      },
      {
        key: 'inProgress',
        label: 'Em execução',
        statuses: [TicketStatus.InProgress],
        total: 0,
      },
      {
        key: 'onHold',
        label: 'Em espera',
        statuses: [TicketStatus.OnHold],
        total: 0,
      },
      {
        key: 'completed',
        label: 'Concluído',
        statuses: [TicketStatus.Completed],
        total: 0,
      },
      {
        key: 'finished',
        label: 'Finalizado',
        statuses: [TicketStatus.Finished],
        total: 0,
      },
      {
        key: 'scheduled',
        label: 'Agendados',
        statuses: [TicketStatus.Scheduled],
        total: 0,
      },
      {
        key: 'all',
        label: 'Todos',
        statuses: [
          TicketStatus.Scheduled,
          TicketStatus.WaitingExecution,
          TicketStatus.InProgress,
          TicketStatus.OnHold,
          TicketStatus.Finished,
        ],
        total: 0,
      },
    ];
  }

  private async fetchOptions(
    selectedClientId: number | undefined,
    visibility: Visibility,
  ): Promise<ImprovementFilterOptions> {
    const [clients, requesters, technicians] = await Promise.all([
      this.fetchClients(visibility),
      selectedClientId
        ? this.database.$queryRawUnsafe<OptionRow[]>(
            `SELECT pessoa_id AS id, pessoa_nom AS name
             FROM pessoas
             WHERE pessoa_clt = ?
             ORDER BY pessoa_nom ASC`,
            selectedClientId,
          )
        : Promise.resolve<OptionRow[]>([]),
      this.fetchTechnicians(),
    ]);

    return {
      clients: clients.map(this.mapOption),
      requesters: requesters.map(this.mapOption),
      technicians,
    };
  }

  private async fetchClients(visibility: Visibility): Promise<OptionRow[]> {
    const where = ["clt_sts = '1'"];
    const params: unknown[] = [];

    if (visibility.restrictClients) {
      appendInFilter(where, params, 'clt_id', visibility.clientIds);
    }

    return this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT clt_id AS id, clt_nomef AS name
       FROM clientes
       WHERE ${where.join(' AND ')}
       ORDER BY clt_nomef ASC`,
      ...params,
    );
  }

  private async fetchTechnicians(): Promise<ImprovementFilterOption[]> {
    const rows = await this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT user_id AS id, user_nome AS name
       FROM usuarios
       ORDER BY user_nome ASC`,
    );

    return [
      { id: 0, name: 'Não determinado' },
      ...rows.map(this.mapOption),
    ];
  }

  private mapOption(row: OptionRow): ImprovementFilterOption {
    return {
      id: row.id,
      name: row.name,
    };
  }

  private async resolveVisibility(userId: number): Promise<Visibility> {
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

  private mapRow(row: ImprovementRow): ImprovementListItem {
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
      type: row.tipo,
      level: row.nivel,
      form: row.forma,
      recurrent: row.reincidente === 1,
      recurring: row.recorrente === 2,
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
        name: row.local_id === 0 ? 'Não informado' : row.local_nome,
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
        id: row.tecnico_id ?? 0,
        name: row.tecnico_id ? row.tecnico_nome : 'Não direcionado',
      },
    };
  }
}

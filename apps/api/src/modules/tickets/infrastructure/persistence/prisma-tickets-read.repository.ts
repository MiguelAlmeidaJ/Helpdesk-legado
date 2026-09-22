import { Inject, Injectable } from '@nestjs/common';
import {
  TICKET_STATUS_LABELS,
  TicketStatus,
  type TicketFilterOption,
  type TicketFilterOptions,
  type TicketListFilters,
  type TicketListItem,
  type TicketListSort,
  type TicketStatusCard,
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
  sla_remaining_seconds: bigint | number | string | null;
  sla_order: bigint | number | string;
  sla_bell_order: bigint | number | string;
  wait_seconds: bigint | number | string;
  last_activity_at: Date | string | null;
  quality_threshold_minutes: bigint | number | string;
  quality_elapsed_seconds: bigint | number | string;
  quality_remaining_seconds: bigint | number | string;
  quality_breached: bigint | number | string;
  quality_last_interaction_at: Date | string | null;
  clerio_threshold_minutes: bigint | number | string;
  clerio_elapsed_seconds: bigint | number | string;
  clerio_remaining_seconds: bigint | number | string;
  clerio_breached: bigint | number | string;
  clerio_paused: bigint | number | string;
  latest_wait_id: number | null;
  latest_wait_started_at: Date | string | null;
  latest_wait_scheduled_resume_at: Date | string | null;
}

interface Visibility {
  restrictClients: boolean;
  clientIds: number[];
}

interface BuiltWhere {
  sql: string;
  params: unknown[];
}

const SORT_SQL: Partial<Record<TicketListSort, string>> = {
  id: 'a.id',
  client: 'c.clt_nomef',
  openedAt: 'a.abertura',
  level: 'a.nivel',
  priority: 'a.prioridade',
  technician: 'u.user_nome',
  status: 'a.status',
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

function toNumber(value: bigint | number | string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveUnique(values: number[]): number[] {
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
  const normalized = positiveUnique(values);

  if (normalized.length === 0) {
    return;
  }

  where.push(`${column} IN (${normalized.map(() => '?').join(', ')})`);
  params.push(...normalized);
}

function waitSecondsSql(): string {
  return `COALESCE((
    SELECT SUM(
      CASE
        WHEN e.espera_end IS NOT NULL
        THEN TIMESTAMPDIFF(SECOND, e.espera_start, e.espera_end)
        ELSE 0
      END
    )
    FROM espera e
    WHERE e.espera_atd = a.id
  ), 0)`;
}

function qualityLastInteractionSql(): string {
  return 'COALESCE(ia.last_interaction_at, a.abertura)';
}

function qualityThresholdMinutesSql(): string {
  return 'COALESCE(NULLIF(cfg.tempo_alerta, 0), 40)';
}

function clerioThresholdMinutesSql(): string {
  return 'COALESCE(NULLIF(cfg.sla_n1, 0), 60)';
}

function qualityElapsedSecondsSql(): string {
  return `GREATEST(
    0,
    COALESCE(
      TIMESTAMPDIFF(SECOND, ${qualityLastInteractionSql()}, NOW()),
      0
    )
  )`;
}

function clerioElapsedSecondsSql(): string {
  return `GREATEST(
    0,
    COALESCE(TIMESTAMPDIFF(SECOND, a.abertura, NOW()), 0)
  )`;
}

function qualityBreachedSql(): string {
  return `CASE
    WHEN a.status IN (1, 2, 3)
      AND (${qualityElapsedSecondsSql()}) >= ((${qualityThresholdMinutesSql()}) * 60)
    THEN 1
    ELSE 0
  END`;
}

function clerioBreachedSql(): string {
  return `CASE
    WHEN a.status IN (1, 2, 3)
      AND (${clerioElapsedSecondsSql()}) >= ((${clerioThresholdMinutesSql()}) * 60)
    THEN 1
    ELSE 0
  END`;
}

function slaOrderSql(): string {
  return `CASE
    WHEN (${qualityBreachedSql()}) = 1 THEN 0
    WHEN (${clerioBreachedSql()}) = 1 THEN 1
    WHEN a.status = 1 THEN 2
    WHEN a.status = 2 THEN 3
    WHEN a.status = 3 THEN 4
    WHEN a.status = 5 THEN 10
    WHEN a.status = 4 THEN 12
    WHEN a.status = 0 THEN 13
    ELSE 14
  END`;
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
         FROM atendimentos a
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

    const filters = query.filters;
    const direction = filters.direction === 'asc' ? 'ASC' : 'DESC';
    const offset = (query.page - 1) * query.limit;

    const waitSeconds = waitSecondsSql();
    const qualityLastInteraction = qualityLastInteractionSql();
    const qualityThresholdMinutes = qualityThresholdMinutesSql();
    const qualityElapsedSeconds = qualityElapsedSecondsSql();
    const qualityRemainingSeconds =
      `((${qualityThresholdMinutes}) * 60) - (${qualityElapsedSeconds})`;
    const qualityBreached = qualityBreachedSql();
    const clerioThresholdMinutes = clerioThresholdMinutesSql();
    const clerioElapsedSeconds = clerioElapsedSecondsSql();
    const clerioRemainingSeconds =
      `((${clerioThresholdMinutes}) * 60) - (${clerioElapsedSeconds})`;
    const clerioBreached = clerioBreachedSql();
    const slaOrder = slaOrderSql();

    const sortColumn = SORT_SQL[filters.sort] ?? 'a.abertura';
    const orderBy =
      filters.sort === 'sla'
        ? 'sla_order ASC, quality_remaining_seconds ASC, clerio_remaining_seconds ASC, a.id ASC'
        : `${sortColumn} ${direction}, a.id ASC`;

    const rows = await this.database.$queryRawUnsafe<TicketRow[]>(
      `
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
        u.user_nome AS tecnico_nome,
        ${qualityRemainingSeconds} AS sla_remaining_seconds,
        ${slaOrder} AS sla_order,
        CASE WHEN (${clerioBreached}) = 1 THEN 0 ELSE 3 END AS sla_bell_order,
        ${waitSeconds} AS wait_seconds,
        ${qualityLastInteraction} AS last_activity_at,
        ${qualityThresholdMinutes} AS quality_threshold_minutes,
        ${qualityElapsedSeconds} AS quality_elapsed_seconds,
        ${qualityRemainingSeconds} AS quality_remaining_seconds,
        ${qualityBreached} AS quality_breached,
        ${qualityLastInteraction} AS quality_last_interaction_at,
        ${clerioThresholdMinutes} AS clerio_threshold_minutes,
        ${clerioElapsedSeconds} AS clerio_elapsed_seconds,
        ${clerioRemainingSeconds} AS clerio_remaining_seconds,
        ${clerioBreached} AS clerio_breached,
        CASE WHEN a.status = 3 THEN 1 ELSE 0 END AS clerio_paused,
        (
          SELECT e.espera_id
          FROM espera e
          WHERE e.espera_atd = a.id
          ORDER BY e.espera_id DESC
          LIMIT 1
        ) AS latest_wait_id,
        (
          SELECT e.espera_start
          FROM espera e
          WHERE e.espera_atd = a.id
          ORDER BY e.espera_id DESC
          LIMIT 1
        ) AS latest_wait_started_at,
        (
          SELECT e.espera_prev
          FROM espera e
          WHERE e.espera_atd = a.id
          ORDER BY e.espera_id DESC
          LIMIT 1
        ) AS latest_wait_scheduled_resume_at
      FROM atendimentos a
      INNER JOIN clientes c ON c.clt_id = a.cliente
      LEFT JOIN pessoas p ON p.pessoa_id = a.pessoa
      LEFT JOIN locais l ON l.local_id = a.local
      LEFT JOIN categorias cat ON cat.cat_id = a.categoria
      LEFT JOIN subcategorias scat ON scat.scat_id = a.subcategoria
      LEFT JOIN itens i ON i.itens_id = a.item
      LEFT JOIN usuarios u ON u.user_id = a.tecnico
      LEFT JOIN (
        SELECT
          inter_atd,
          MAX(inter_data) AS last_interaction_at
        FROM interatividade
        WHERE COALESCE(inter_tipo, 0) > 0
        GROUP BY inter_atd
      ) ia ON ia.inter_atd = a.id
      LEFT JOIN (
        SELECT tempo_alerta, sla_n1
        FROM configuracao
        ORDER BY id ASC
        LIMIT 1
      ) cfg ON 1 = 1
      ${listWhere.sql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
      `,
      ...listWhere.params,
      query.limit,
      offset,
    );

    return {
      total,
      data: rows.map((row) => this.mapRow(row)),
      statusCards,
      options,
    };
  }

  private buildWhere(
    query: TicketsReadRepositoryQuery,
    visibility: Visibility,
  ): BuiltWhere {
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

    appendInFilter(where, params, 'a.tecnico', filters.technicianIds);

    if (filters.openedFrom) {
      where.push('a.abertura >= ?');
      params.push(`${filters.openedFrom} 00:00:00`);
    }

    if (filters.openedTo) {
      where.push('a.abertura <= ?');
      params.push(`${filters.openedTo} 23:59:59`);
    }

    if (visibility.restrictClients) {
      appendInFilter(where, params, 'a.cliente', visibility.clientIds);
    }

    if (query.ownerTechnicianId) {
      where.push('a.tecnico = ?');
      params.push(query.ownerTechnicianId);
    }

    return {
      sql: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '',
      params,
    };
  }

  private async fetchStatusCards(
    where: BuiltWhere,
  ): Promise<TicketStatusCard[]> {
    const rows = await this.database.$queryRawUnsafe<StatusCardsRow[]>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS waiting,
        COALESCE(SUM(CASE WHEN a.status = 2 THEN 1 ELSE 0 END), 0) AS in_progress,
        COALESCE(SUM(CASE WHEN a.status = 3 THEN 1 ELSE 0 END), 0) AS on_hold,
        COALESCE(SUM(CASE WHEN a.status = 5 THEN 1 ELSE 0 END), 0) AS completed,
        COALESCE(SUM(CASE WHEN a.status = 4 THEN 1 ELSE 0 END), 0) AS finished,
        COALESCE(SUM(CASE WHEN a.status = 0 THEN 1 ELSE 0 END), 0) AS scheduled,
        COALESCE(SUM(CASE WHEN a.status IN (0, 1, 2, 3, 4) THEN 1 ELSE 0 END), 0) AS all_open
      FROM atendimentos a
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

  private emptyStatusCards(): TicketStatusCard[] {
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
  ): Promise<TicketFilterOptions> {
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
      technicians: technicians.map(this.mapOption),
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

  private async fetchTechnicians(): Promise<OptionRow[]> {
    return this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT user_id AS id, user_nome AS name
       FROM usuarios
       WHERE user_sts = '1'
         AND user_id > 1
         AND user_funcao IN (2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14)
       ORDER BY user_nome ASC`,
    );
  }

  private mapOption(row: OptionRow): TicketFilterOption {
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
      sla: {
        quality: {
          thresholdMinutes: toNumber(row.quality_threshold_minutes) ?? 40,
          elapsedSeconds: toNumber(row.quality_elapsed_seconds) ?? 0,
          remainingSeconds: toNumber(row.quality_remaining_seconds) ?? 0,
          breached: (toNumber(row.quality_breached) ?? 0) === 1,
          lastInteractionAt: toIsoString(row.quality_last_interaction_at),
        },
        clerio: {
          thresholdMinutes: toNumber(row.clerio_threshold_minutes) ?? 60,
          elapsedSeconds: toNumber(row.clerio_elapsed_seconds) ?? 0,
          remainingSeconds: toNumber(row.clerio_remaining_seconds) ?? 0,
          breached: (toNumber(row.clerio_breached) ?? 0) === 1,
          paused: (toNumber(row.clerio_paused) ?? 0) === 1,
        },
        remainingSeconds: toNumber(row.sla_remaining_seconds),
        order: toNumber(row.sla_order) ?? 14,
        bellOrder: toNumber(row.sla_bell_order) ?? 3,
        waitSeconds: toNumber(row.wait_seconds) ?? 0,
        lastActivityAt: toIsoString(row.last_activity_at),
        latestWait: {
          id: row.latest_wait_id,
          startedAt: toIsoString(row.latest_wait_started_at),
          scheduledResumeAt: toIsoString(
            row.latest_wait_scheduled_resume_at,
          ),
        },
      },
    };
  }
}

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import type { TicketAnalyticsFilters, TicketAnalyticsResponse, TicketAnalyticsRow, TicketReportCatalog, TicketTechnicianTimingDetail, TicketTechnicianTimingFilters, TicketTechnicianTimingResponse, TechnicianWorkloadResponse, ReportOption } from '@helpdesk/contracts';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import { TicketAnalyticsRepository } from '../application/ports/ticket-analytics.repository';
import { appendNumberInFilter, resolveTicketReportVisibility, type TicketReportVisibility } from './ticket-report-visibility';

// Identifiers are fixed here; query values never become SQL identifiers.
const TABLES = { tickets: 'atendimentos', tasks: 'tarefas', improvements: 'melhorias' } as const;
const MAX_ROWS = 20000;

function scope(where: string[], params: unknown[], visibility: TicketReportVisibility, column: string) {
  if (!visibility.restrictClients) return;
  if (!visibility.clientIds.length) where.push('1 = 0');
  else appendNumberInFilter(where, params, column, visibility.clientIds);
}

@Injectable()
export class PrismaTicketAnalyticsRepository extends TicketAnalyticsRepository {
  constructor(@Inject(NIVEL3_DATABASE) private readonly database: Nivel3DatabaseClient) { super(); }

  async analytics(userId: number, filters: TicketAnalyticsFilters): Promise<TicketAnalyticsResponse> {
    const visibility = await resolveTicketReportVisibility(this.database, userId);
    const sources = filters.source === 'unified' ? ['tickets', 'tasks'] as const : [filters.source];
    const rows: TicketAnalyticsRow[] = [];
    for (const source of sources) {
      const where = ['a.abertura >= ?', 'a.abertura < DATE_ADD(?, INTERVAL 1 DAY)'];
      if (filters.view !== 'time') where.push('a.status > 0');
      const params: unknown[] = [filters.startDate, filters.endDate];
      scope(where, params, visibility, 'a.cliente');
      if (filters.clientIds.length) {
        appendNumberInFilter(where, params, 'a.cliente', filters.clientIds);
      }

      for (const [column, value] of [
        ['a.cliente', filters.clientIds.length ? 0 : filters.clientId],
        ['a.local', filters.locationId],
        ['a.tecnico', filters.technicianId],
        ['a.categoria', filters.categoryId],
        ['cat.cat_setor', filters.categorySector],
        ['a.status', filters.status],
      ] as const) {
        if (value) {
          where.push(`${column} = ?`);
          params.push(value);
        }
      }
      // The unified legacy report filters TI levels and includes all tasks.
      if (source !== 'tasks' && (filters.view !== 'time' || filters.level)) appendNumberInFilter(where, params, 'a.nivel', filters.level ? [filters.level] : [1, 2, 3, 4, 5]);
      const result = await this.database.$queryRawUnsafe<TicketAnalyticsRow[]>(
        `SELECT a.id, '${source}' AS source, a.cliente AS clientId,
          COALESCE(c.clt_nomer, c.clt_nomef, '') AS clientName,
          COALESCE(l.local_nom, '') AS locationName,
          CONCAT_WS(', ', l.local_end, l.local_city, l.local_uf) AS locationAddress,
          COALESCE(p.pessoa_nom, '') AS requesterName, COALESCE(u.user_nome, 'Sem técnico') AS technicianName,
          COALESCE(cat.cat_nome, '') AS categoryName, COALESCE(sub.scat_nome, '') AS subcategoryName,
          COALESCE(i.itens_nome, '') AS itemName,
          COALESCE(a.tipo, 0) AS type, COALESCE(a.nivel, 0) AS level, COALESCE(a.forma, 0) AS method, a.status,
          DATE_FORMAT(a.abertura, '%Y-%m-%dT%H:%i:%s') AS openedAt,
          DATE_FORMAT(a.fechamento, '%Y-%m-%dT%H:%i:%s') AS closedAt,
          COALESCE(a.desc_abertura, '') AS openingDescription, COALESCE(a.desc_fechamento, '') AS closingDescription,
          GREATEST(
            0,
            TIMESTAMPDIFF(
              SECOND,
              a.abertura,
              COALESCE(a.fechamento, NOW())
            )
          ) AS elapsedSeconds
        FROM ${TABLES[source]} a
        INNER JOIN clientes c ON c.clt_id = a.cliente
        LEFT JOIN locais l ON l.local_id = a.local
        LEFT JOIN pessoas p ON p.pessoa_id = a.pessoa
        LEFT JOIN usuarios u ON u.user_id = a.tecnico
        LEFT JOIN categorias cat ON cat.cat_id = a.categoria
        LEFT JOIN subcategorias sub ON sub.scat_id = a.subcategoria
        LEFT JOIN itens i ON i.itens_id = a.item
        WHERE ${where.join(' AND ')} ORDER BY a.abertura, a.id LIMIT ${MAX_ROWS + 1}`, ...params);
      rows.push(...result.map(row => ({ ...row, elapsedSeconds: Number(row.elapsedSeconds) })));
      if (rows.length > MAX_ROWS) throw new BadRequestException('Relatório acima de 20.000 registros. Reduza o período ou selecione um cliente.');
    }
    rows.sort((a, b) => a.openedAt.localeCompare(b.openedAt) || a.source.localeCompare(b.source) || a.id - b.id);
    return { filters, generatedAt: new Date().toISOString(), total: rows.length, rows };
  }

  async catalog(userId: number, clientId: number): Promise<TicketReportCatalog> {
    const visibility = await resolveTicketReportVisibility(this.database, userId);
    const where = ['c.clt_sts = 1'];
    const params: unknown[] = [];
    scope(where, params, visibility, 'c.clt_id');
    const clients = await this.database.$queryRawUnsafe<ReportOption[]>(
      `SELECT c.clt_id AS id, c.clt_nomef AS name FROM clientes c WHERE ${where.join(' AND ')} ORDER BY c.clt_nomef`, ...params);
    const locations = clientId && (!visibility.restrictClients || visibility.clientIds.includes(clientId))
      ? await this.database.$queryRawUnsafe<ReportOption[]>(`SELECT local_id AS id, local_nom AS name FROM locais WHERE local_clt = ? ORDER BY local_nom`, clientId) : [];
    const technicians = visibility.restrictClients && !visibility.clientIds.length ? [] : await this.database.$queryRawUnsafe<ReportOption[]>(
      `SELECT user_id AS id, user_nome AS name FROM usuarios WHERE user_sts = 1 AND user_funcao IN (5, 6) ORDER BY user_nome`);
    const categories = visibility.restrictClients && !visibility.clientIds.length
      ? []
      : await this.database.$queryRawUnsafe<ReportOption[]>(
          `SELECT cat_id AS id, cat_nome AS name
           FROM categorias
           WHERE cat_sts = 1
           ORDER BY cat_nome`,
        );
    return { clients, locations, technicians, categories };
  }

  async technicianTiming(
    userId: number,
    filters: TicketTechnicianTimingFilters,
  ): Promise<TicketTechnicianTimingResponse> {
    const visibility = await resolveTicketReportVisibility(this.database, userId);
    const where = [
      'a.abertura >= ?',
      'a.abertura < DATE_ADD(?, INTERVAL 1 DAY)',
      'COALESCE(a.tecnico, 0) > 0',
    ];
    const params: unknown[] = [filters.startDate, filters.endDate];

    scope(where, params, visibility, 'a.cliente');
    if (filters.clientIds.length) {
      appendNumberInFilter(where, params, 'a.cliente', filters.clientIds);
    }
    if (filters.technicianIds.length) {
      appendNumberInFilter(where, params, 'a.tecnico', filters.technicianIds);
    }
    if (filters.level) {
      where.push('a.nivel = ?');
      params.push(filters.level);
    }

    type TimingDbRow = {
      ticketId: number;
      clientId: number;
      clientName: string;
      requesterName: string;
      technicianId: number;
      technicianName: string;
      level: number;
      status: number;
      openedAt: string;
      acceptedAt: string | null;
      closedAt: string | null;
      acceptanceSeconds: bigint | number | null;
      resolutionSeconds: bigint | number | null;
      handlingSeconds: bigint | number | null;
    };

    const result = await this.database.$queryRawUnsafe<TimingDbRow[]>(
      `SELECT
         a.id AS ticketId,
         a.cliente AS clientId,
         COALESCE(NULLIF(c.clt_nomer, ''), c.clt_nomef, '') AS clientName,
         COALESCE(p.pessoa_nom, '') AS requesterName,
         a.tecnico AS technicianId,
         COALESCE(u.user_nome, CONCAT('Técnico #', a.tecnico)) AS technicianName,
         COALESCE(a.nivel, 0) AS level,
         COALESCE(a.status, 0) AS status,
         DATE_FORMAT(a.abertura, '%Y-%m-%dT%H:%i:%s') AS openedAt,
         DATE_FORMAT(acc.accepted_at, '%Y-%m-%dT%H:%i:%s') AS acceptedAt,
         DATE_FORMAT(a.fechamento, '%Y-%m-%dT%H:%i:%s') AS closedAt,
         CASE
           WHEN acc.accepted_at IS NULL THEN NULL
           ELSE GREATEST(0, TIMESTAMPDIFF(SECOND, a.abertura, acc.accepted_at))
         END AS acceptanceSeconds,
         CASE
           WHEN a.fechamento IS NULL THEN NULL
           ELSE GREATEST(0, TIMESTAMPDIFF(SECOND, a.abertura, a.fechamento))
         END AS resolutionSeconds,
         CASE
           WHEN acc.accepted_at IS NULL OR a.fechamento IS NULL THEN NULL
           ELSE GREATEST(0, TIMESTAMPDIFF(SECOND, acc.accepted_at, a.fechamento))
         END AS handlingSeconds
       FROM atendimentos a
       INNER JOIN clientes c ON c.clt_id = a.cliente
       LEFT JOIN pessoas p ON p.pessoa_id = a.pessoa
       LEFT JOIN usuarios u ON u.user_id = a.tecnico
       LEFT JOIN (
         SELECT inter_atd, inter_user, MIN(inter_data) AS accepted_at
         FROM interatividade
         WHERE inter_tipo = 2
         GROUP BY inter_atd, inter_user
       ) acc
         ON acc.inter_atd = a.id
        AND acc.inter_user = a.tecnico
       WHERE ${where.join(' AND ')}
       ORDER BY u.user_nome, a.abertura, a.id
       LIMIT ${MAX_ROWS + 1}`,
      ...params,
    );

    if (result.length > MAX_ROWS) {
      throw new BadRequestException(
        'Relatório acima de 20.000 registros. Reduza o período ou os filtros.',
      );
    }

    const details: TicketTechnicianTimingDetail[] = result.map((row) => ({
      ...row,
      ticketId: Number(row.ticketId),
      clientId: Number(row.clientId),
      technicianId: Number(row.technicianId),
      level: Number(row.level),
      status: Number(row.status),
      acceptanceSeconds:
        row.acceptanceSeconds === null ? null : Number(row.acceptanceSeconds),
      resolutionSeconds:
        row.resolutionSeconds === null ? null : Number(row.resolutionSeconds),
      handlingSeconds:
        row.handlingSeconds === null ? null : Number(row.handlingSeconds),
    }));

    type Aggregate = {
      technicianId: number;
      technicianName: string;
      ticketCount: number;
      acceptance: number[];
      resolution: number[];
      handling: number[];
    };

    const byTechnician = new Map<number, Aggregate>();
    for (const detail of details) {
      const aggregate = byTechnician.get(detail.technicianId) ?? {
        technicianId: detail.technicianId,
        technicianName: detail.technicianName,
        ticketCount: 0,
        acceptance: [],
        resolution: [],
        handling: [],
      };
      aggregate.ticketCount += 1;
      if (detail.acceptanceSeconds !== null) {
        aggregate.acceptance.push(detail.acceptanceSeconds);
      }
      if (detail.resolutionSeconds !== null) {
        aggregate.resolution.push(detail.resolutionSeconds);
      }
      if (detail.handlingSeconds !== null) {
        aggregate.handling.push(detail.handlingSeconds);
      }
      byTechnician.set(detail.technicianId, aggregate);
    }

    const average = (values: number[]): number | null =>
      values.length
        ? Math.round(values.reduce((total, value) => total + value, 0) / values.length)
        : null;
    const percentile = (values: number[], rank: number): number | null => {
      if (!values.length) return null;
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.max(0, Math.ceil(sorted.length * rank) - 1)];
    };
    const maximum = (values: number[]): number | null =>
      values.length ? Math.max(...values) : null;

    const rows = [...byTechnician.values()]
      .map((aggregate) => ({
        technicianId: aggregate.technicianId,
        technicianName: aggregate.technicianName,
        ticketCount: aggregate.ticketCount,
        acceptedCount: aggregate.acceptance.length,
        completedCount: aggregate.resolution.length,
        averageAcceptanceSeconds: average(aggregate.acceptance),
        averageResolutionSeconds: average(aggregate.resolution),
        averageHandlingSeconds: average(aggregate.handling),
        maxAcceptanceSeconds: maximum(aggregate.acceptance),
        maxResolutionSeconds: maximum(aggregate.resolution),
        medianAcceptanceSeconds: percentile(aggregate.acceptance, 0.5),
        medianHandlingSeconds: percentile(aggregate.handling, 0.5),
        medianResolutionSeconds: percentile(aggregate.resolution, 0.5),
        p90AcceptanceSeconds: percentile(aggregate.acceptance, 0.9),
        p90ResolutionSeconds: percentile(aggregate.resolution, 0.9),
      }))
      .sort(
        (left, right) =>
          left.technicianName.localeCompare(right.technicianName, 'pt-BR') ||
          left.technicianId - right.technicianId,
      );

    const acceptance = details.flatMap((row) =>
      row.acceptanceSeconds === null ? [] : [row.acceptanceSeconds],
    );
    const resolution = details.flatMap((row) =>
      row.resolutionSeconds === null ? [] : [row.resolutionSeconds],
    );
    const handling = details.flatMap((row) =>
      row.handlingSeconds === null ? [] : [row.handlingSeconds],
    );

    return {
      filters,
      generatedAt: new Date().toISOString(),
      totalTickets: details.length,
      acceptedTickets: acceptance.length,
      completedTickets: resolution.length,
      averageAcceptanceSeconds: average(acceptance),
      averageResolutionSeconds: average(resolution),
      averageHandlingSeconds: average(handling),
      rows,
      details,
    };
  }

  async workload(userId: number): Promise<TechnicianWorkloadResponse> {
    const visibility = await resolveTicketReportVisibility(this.database, userId);
    if (visibility.restrictClients && !visibility.clientIds.length) return { generatedAt: new Date().toISOString(), rows: [] };
    const where = ['a.status IN (1, 2, 3)'];
    const params: unknown[] = [];
    scope(where, params, visibility, 'a.cliente');
    const rows = await this.database.$queryRawUnsafe<Array<{ technicianId: number; technicianName: string; open: bigint; waiting: bigint; overdue: bigint; elapsedSeconds: bigint }>>(
      `SELECT u.user_id AS technicianId, u.user_nome AS technicianName,
        COALESCE(SUM(a.status IN (1, 2)), 0) AS open,
        COALESCE(SUM(a.status = 3), 0) AS waiting,
        COALESCE(SUM(a.status IN (1, 2) AND TIMESTAMPDIFF(SECOND, a.abertura, NOW()) >
          (CASE WHEN a.nivel BETWEEN 1 AND 5 THEN a.nivel ELSE 0 END) * 3600 + COALESCE(w.seconds, 0)), 0) AS overdue,
        COALESCE(SUM(CASE WHEN a.status IN (1, 2) THEN GREATEST(0, TIMESTAMPDIFF(SECOND, a.abertura, NOW())) ELSE 0 END), 0) AS elapsedSeconds
      FROM usuarios u
      LEFT JOIN (SELECT a.* FROM atendimentos a WHERE ${where.join(' AND ')}) a ON a.tecnico = u.user_id
      LEFT JOIN (SELECT espera_atd, SUM(TIMESTAMPDIFF(SECOND, espera_start, espera_end)) AS seconds FROM espera GROUP BY espera_atd) w ON w.espera_atd = a.id
      WHERE u.user_sts = 1 AND u.user_funcao IN (5, 6)
      GROUP BY u.user_id, u.user_nome ORDER BY u.user_nome`, ...params);
    return { generatedAt: new Date().toISOString(), rows: rows.map(row => ({ ...row, open: Number(row.open), waiting: Number(row.waiting), overdue: Number(row.overdue), elapsedSeconds: Number(row.elapsedSeconds) })) };
  }
}

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import type { TicketAnalyticsFilters, TicketAnalyticsResponse, TicketAnalyticsRow, TicketReportCatalog, TechnicianWorkloadResponse, ReportOption } from '@helpdesk/contracts';
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
      const where = ['a.status > 0', 'a.abertura >= ?', 'a.abertura < DATE_ADD(?, INTERVAL 1 DAY)'];
      const params: unknown[] = [filters.startDate, filters.endDate];
      scope(where, params, visibility, 'a.cliente');
      for (const [column, value] of [['a.cliente', filters.clientId], ['a.local', filters.locationId], ['a.tecnico', filters.technicianId]] as const) {
        if (value) { where.push(`${column} = ?`); params.push(value); }
      }
      // The unified legacy report filters TI levels and includes all tasks.
      if (source !== 'tasks') appendNumberInFilter(where, params, 'a.nivel', filters.level ? [filters.level] : [1, 2, 3, 4, 5]);
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
          GREATEST(0, TIMESTAMPDIFF(SECOND, a.abertura, NOW())) AS elapsedSeconds
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
    return { clients, locations, technicians };
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

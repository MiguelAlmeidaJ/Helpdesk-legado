import { Inject, Injectable } from '@nestjs/common';
import type {
  TicketTechnicianTotalsReportResponse,
  TicketTechnicianTotalsReportRow,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import {
  TicketTechnicianTotalsReportRepository,
  type TicketTechnicianTotalsReportQuery,
} from '../application/ports/ticket-technician-totals-report.repository';
import {
  appendNumberInFilter,
  resolveTicketReportVisibility,
} from './ticket-report-visibility';

interface ReportRow {
  technician_id: number;
  technician_name: string | null;
  level_1: bigint | number | string;
  level_2: bigint | number | string;
  level_3: bigint | number | string;
  total: bigint | number | string;
}

@Injectable()
export class PrismaTicketTechnicianTotalsReportRepository extends TicketTechnicianTotalsReportRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async get(
    query: TicketTechnicianTotalsReportQuery,
  ): Promise<TicketTechnicianTotalsReportResponse> {
    const visibility = await resolveTicketReportVisibility(
      this.database,
      query.userId,
    );

    if (visibility.restrictClients && visibility.clientIds.length === 0) {
      return this.emptyResponse(query);
    }

    const where = [
      'a.status > 0',
      'a.abertura >= ?',
      'a.abertura < DATE_ADD(?, INTERVAL 1 DAY)',
    ];
    const params: unknown[] = [query.startDate, query.endDate];
    const levels = query.level === 0 ? [1, 2, 3] : [query.level];

    appendNumberInFilter(where, params, 'a.nivel', levels);

    if (visibility.restrictClients) {
      appendNumberInFilter(where, params, 'a.cliente', visibility.clientIds);
    }

    const rows = await this.database.$queryRawUnsafe<ReportRow[]>(
      `SELECT
         u.user_id AS technician_id,
         u.user_nome AS technician_name,
         SUM(CASE WHEN a.nivel = 1 THEN 1 ELSE 0 END) AS level_1,
         SUM(CASE WHEN a.nivel = 2 THEN 1 ELSE 0 END) AS level_2,
         SUM(CASE WHEN a.nivel = 3 THEN 1 ELSE 0 END) AS level_3,
         COUNT(a.id) AS total
       FROM atendimentos a
       INNER JOIN usuarios u ON a.tecnico = u.user_id
       WHERE ${where.join(' AND ')}
       GROUP BY u.user_id, u.user_nome
       ORDER BY total DESC, u.user_nome ASC`,
      ...params,
    );

    const mappedRows = rows.map((row) => this.mapRow(row));

    return {
      period: {
        startDate: query.startDate,
        endDate: query.endDate,
      },
      level: query.level,
      total: mappedRows.reduce((sum, row) => sum + row.total, 0),
      rows: mappedRows,
    };
  }

  private emptyResponse(
    query: TicketTechnicianTotalsReportQuery,
  ): TicketTechnicianTotalsReportResponse {
    return {
      period: {
        startDate: query.startDate,
        endDate: query.endDate,
      },
      level: query.level,
      total: 0,
      rows: [],
    };
  }

  private mapRow(row: ReportRow): TicketTechnicianTotalsReportRow {
    return {
      technicianId: row.technician_id,
      technicianName: row.technician_name?.trim() || 'Sem identificação',
      level1: Number(row.level_1 ?? 0),
      level2: Number(row.level_2 ?? 0),
      level3: Number(row.level_3 ?? 0),
      total: Number(row.total ?? 0),
    };
  }
}

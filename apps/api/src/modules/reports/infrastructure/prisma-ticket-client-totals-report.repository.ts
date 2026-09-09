import { Inject, Injectable } from '@nestjs/common';
import type {
  TicketClientTotalsReportResponse,
  TicketClientTotalsReportRow,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import {
  TicketClientTotalsReportRepository,
  type TicketClientTotalsReportQuery,
} from '../application/ports/ticket-client-totals-report.repository';

interface UserVisibilityRow {
  tipo_usuario: number | null;
}

interface ClientScopeRow {
  cliente_id: number;
}

interface ReportRow {
  client_id: number;
  client_name: string | null;
  level_1: bigint | number | string;
  level_2: bigint | number | string;
  level_3: bigint | number | string;
  total: bigint | number | string;
}

interface Visibility {
  restrictClients: boolean;
  clientIds: number[];
}

function positiveUnique(values: number[]): number[] {
  return [
    ...new Set(
      values.filter((value) => Number.isInteger(value) && value > 0),
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

@Injectable()
export class PrismaTicketClientTotalsReportRepository extends TicketClientTotalsReportRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async get(
    query: TicketClientTotalsReportQuery,
  ): Promise<TicketClientTotalsReportResponse> {
    const visibility = await this.resolveVisibility(query.userId);

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

    appendInFilter(where, params, 'a.nivel', levels);

    if (visibility.restrictClients) {
      appendInFilter(where, params, 'a.cliente', visibility.clientIds);
    }

    const rows = await this.database.$queryRawUnsafe<ReportRow[]>(
      `SELECT
         c.clt_id AS client_id,
         c.clt_nomer AS client_name,
         SUM(CASE WHEN a.nivel = 1 THEN 1 ELSE 0 END) AS level_1,
         SUM(CASE WHEN a.nivel = 2 THEN 1 ELSE 0 END) AS level_2,
         SUM(CASE WHEN a.nivel = 3 THEN 1 ELSE 0 END) AS level_3,
         COUNT(*) AS total
       FROM atendimentos a
       INNER JOIN clientes c ON c.clt_id = a.cliente
       WHERE ${where.join(' AND ')}
       GROUP BY c.clt_id, c.clt_nomer
       ORDER BY total DESC, c.clt_nomer ASC`,
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
    query: TicketClientTotalsReportQuery,
  ): TicketClientTotalsReportResponse {
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

  private async resolveVisibility(userId: number): Promise<Visibility> {
    const users = await this.database.$queryRawUnsafe<UserVisibilityRow[]>(
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

  private mapRow(row: ReportRow): TicketClientTotalsReportRow {
    return {
      clientId: row.client_id,
      clientName: row.client_name?.trim() || 'Sem identificação',
      level1: Number(row.level_1 ?? 0),
      level2: Number(row.level_2 ?? 0),
      level3: Number(row.level_3 ?? 0),
      total: Number(row.total ?? 0),
    };
  }
}

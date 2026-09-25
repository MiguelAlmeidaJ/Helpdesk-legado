import { Inject, Injectable } from '@nestjs/common';
import type {
  TicketBreakdownLevel,
  TicketBreakdownMode,
  TicketBreakdownReportResponse,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import {
  appendNumberInFilter,
  resolveTicketReportVisibility,
} from '../infrastructure/ticket-report-visibility';

interface Row {
  key_value: string | number | null;
  label: string | null;
  bucket_date: string | Date | null;
  level_1: number | bigint | string;
  level_2: number | bigint | string;
  level_3: number | bigint | string;
  total: number | bigint | string;
}

export interface TicketBreakdownInput {
  userId: number;
  mode: TicketBreakdownMode;
  startDate: string;
  endDate: string;
  level: TicketBreakdownLevel;
}

@Injectable()
export class TicketBreakdownReportService {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async get(input: TicketBreakdownInput): Promise<TicketBreakdownReportResponse> {
    const visibility = await resolveTicketReportVisibility(
      this.database,
      input.userId,
    );
    const where = [
      'a.status > 0',
      'a.abertura >= ?',
      'a.abertura < DATE_ADD(?, INTERVAL 1 DAY)',
    ];
    const params: unknown[] = [input.startDate, input.endDate];
    appendNumberInFilter(
      where,
      params,
      'a.nivel',
      input.level === 0 ? [1, 2, 3] : [input.level],
    );

    if (visibility.restrictClients) {
      if (!visibility.clientIds.length) {
        return this.empty(input);
      }
      appendNumberInFilter(where, params, 'a.cliente', visibility.clientIds);
    }

    const spec = this.spec(input.mode);
    const rows = await this.database.$queryRawUnsafe<Row[]>(
      `SELECT
         ${spec.key} AS key_value,
         ${spec.label} AS label,
         ${spec.date} AS bucket_date,
         SUM(CASE WHEN a.nivel = 1 THEN 1 ELSE 0 END) AS level_1,
         SUM(CASE WHEN a.nivel = 2 THEN 1 ELSE 0 END) AS level_2,
         SUM(CASE WHEN a.nivel = 3 THEN 1 ELSE 0 END) AS level_3,
         COUNT(a.id) AS total
       FROM atendimentos a
       ${spec.joins}
       WHERE ${where.join(' AND ')}
       GROUP BY ${spec.groupBy}
       ORDER BY ${spec.orderBy}`,
      ...params,
    );

    const mapped = rows.map((row) => ({
      key: String(row.key_value ?? ''),
      label: row.label?.trim() || 'Sem identificação',
      date: this.date(row.bucket_date),
      level1: Number(row.level_1 ?? 0),
      level2: Number(row.level_2 ?? 0),
      level3: Number(row.level_3 ?? 0),
      total: Number(row.total ?? 0),
    }));

    return {
      mode: input.mode,
      period: { startDate: input.startDate, endDate: input.endDate },
      level: input.level,
      total: mapped.reduce((sum, row) => sum + row.total, 0),
      rows: mapped,
    };
  }

  private spec(mode: TicketBreakdownMode) {
    if (mode === 'client-daily') {
      return {
        key: "CONCAT(c.clt_id, ':', DATE_FORMAT(a.abertura, '%Y-%m-%d'))",
        label: "COALESCE(NULLIF(c.clt_nomef, ''), c.clt_nomer)",
        date: "DATE_FORMAT(a.abertura, '%Y-%m-%d')",
        joins: 'INNER JOIN clientes c ON c.clt_id = a.cliente',
        groupBy: "c.clt_id, c.clt_nomef, c.clt_nomer, DATE(a.abertura)",
        orderBy: 'bucket_date DESC, label ASC',
      };
    }

    if (mode === 'technician-daily') {
      return {
        key: "CONCAT(COALESCE(u.user_id, 0), ':', DATE_FORMAT(a.abertura, '%Y-%m-%d'))",
        label: "COALESCE(NULLIF(u.user_nome, ''), 'Não atribuído')",
        date: "DATE_FORMAT(a.abertura, '%Y-%m-%d')",
        joins: 'LEFT JOIN usuarios u ON u.user_id = a.tecnico',
        groupBy: "u.user_id, u.user_nome, DATE(a.abertura)",
        orderBy: 'bucket_date DESC, label ASC',
      };
    }

    return {
      key: 'COALESCE(p.pessoa_id, 0)',
      label: "COALESCE(NULLIF(p.pessoa_nom, ''), 'Não informado')",
      date: 'NULL',
      joins: 'LEFT JOIN pessoas p ON p.pessoa_id = a.pessoa',
      groupBy: 'p.pessoa_id, p.pessoa_nom',
      orderBy: 'total DESC, label ASC',
    };
  }

  private date(value: string | Date | null): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value.slice(0, 10);
    return value.toISOString().slice(0, 10);
  }

  private empty(input: TicketBreakdownInput): TicketBreakdownReportResponse {
    return {
      mode: input.mode,
      period: { startDate: input.startDate, endDate: input.endDate },
      level: input.level,
      total: 0,
      rows: [],
    };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import type {
  LogisticsExpenseAdminBreakdownItem,
  LogisticsExpenseAdminDashboardResponse,
  LogisticsExpenseAdminDetailsResponse,
  LogisticsExpenseAdminGroup,
  LogisticsExpenseAdminStatus,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';

interface ClockRow {
  period_start: string;
  period_end: string;
}

interface TotalsRow {
  global_pending: bigint | number | string | null;
  global_approved: bigint | number | string | null;
  global_approved_count: bigint | number | string | null;
  period_pending: bigint | number | string | null;
  period_approved: bigint | number | string | null;
  period_paid: bigint | number | string | null;
  period_pending_count: bigint | number | string | null;
  period_approved_count: bigint | number | string | null;
  period_paid_count: bigint | number | string | null;
}

interface BreakdownRow {
  group_key: bigint | number | string | null;
  label: string | null;
  amount: bigint | number | string | null;
  count: bigint | number | string | null;
}

interface TimelineRow {
  day: string;
  amount: bigint | number | string | null;
  count: bigint | number | string | null;
}

interface DetailRow {
  id: bigint | number | string;
  created_at: string;
  user_name: string | null;
  description: string | null;
  amount: bigint | number | string | null;
}

function numberValue(
  value: bigint | number | string | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

@Injectable()
export class ExpenseAdminDashboardRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async summary(
    startDate: string | undefined,
    endDate: string | undefined,
    status: LogisticsExpenseAdminStatus,
  ): Promise<LogisticsExpenseAdminDashboardResponse> {
    const period = await this.period(startDate, endDate);
    const start = `${period.startDate} 00:00:00`;
    const end = `${period.endDate} 23:59:59`;

    const [
      totalsRows,
      groupRows,
      categoryRows,
      clientRows,
      collaboratorRows,
      timelineRows,
    ] = await Promise.all([
      this.totals(start, end),
      this.groups(status, start, end),
      this.categories(status, start, end),
      this.clients(status, start, end),
      this.collaborators(status, start, end),
      this.timeline(status, start, end),
    ]);

    const totals = totalsRows[0];

    return {
      period: { ...period, status },
      totals: {
        globalPending: numberValue(totals?.global_pending),
        globalApproved: numberValue(totals?.global_approved),
        globalApprovedCount: numberValue(totals?.global_approved_count),
        periodPending: numberValue(totals?.period_pending),
        periodApproved: numberValue(totals?.period_approved),
        periodPaid: numberValue(totals?.period_paid),
        periodPendingCount: numberValue(totals?.period_pending_count),
        periodApprovedCount: numberValue(totals?.period_approved_count),
        periodPaidCount: numberValue(totals?.period_paid_count),
      },
      groups: this.breakdown(groupRows),
      subgroups: this.breakdown(categoryRows),
      categories: this.breakdown(categoryRows),
      clients: this.breakdown(clientRows),
      collaborators: this.breakdown(collaboratorRows),
      timeline: timelineRows.map((row) => ({
        date: row.day,
        amount: numberValue(row.amount),
        count: numberValue(row.count),
      })),
    };
  }

  async details(input: {
    startDate?: string;
    endDate?: string;
    status: LogisticsExpenseAdminStatus;
    group: LogisticsExpenseAdminGroup;
    key: string;
  }): Promise<LogisticsExpenseAdminDetailsResponse> {
    const period = await this.period(input.startDate, input.endDate);
    const start = `${period.startDate} 00:00:00`;
    const end = `${period.endDate} 23:59:59`;
    const params: Array<number | string> = [input.status, start, end];
    let joins = '';
    let groupFilter = '';

    if (input.group === 'category' || input.group === 'subgroup') {
      joins = `
        LEFT JOIN category legacy_category
          ON legacy_category.id = r.category_id
          AND r.date_created < '2025-10-01 00:00:00'
        LEFT JOIN categorias_subgrupo current_category
          ON current_category.id = r.category_id
          AND r.date_created >= '2025-10-01 00:00:00'`;
      groupFilter = `
        AND (
          legacy_category.categories = ?
          OR current_category.nome = ?
        )`;
      params.push(input.key, input.key);
    } else if (input.group === 'group') {
      if (input.key === '__legacy__') {
        groupFilter = `AND r.date_created < '2025-10-01 00:00:00'`;
      } else {
        joins = `
          JOIN categorias_subgrupo current_category
            ON current_category.id = r.category_id
            AND r.date_created >= '2025-10-01 00:00:00'
          JOIN categorias_grupo current_group
            ON current_group.id = current_category.id_grupo`;
        groupFilter = `AND current_group.nome = ?`;
        params.push(input.key);
      }
    } else if (input.group === 'client') {
      groupFilter = `AND COALESCE(r.cliente, '') = ?`;
      params.push(input.key);
    } else {
      groupFilter = `AND r.user_id = ?`;
      params.push(Number(input.key));
    }

    const rows = await this.database.$queryRawUnsafe<DetailRow[]>(
      `SELECT
         r.id,
         DATE_FORMAT(r.date_created, '%Y-%m-%dT%H:%i:%s') AS created_at,
         COALESCE(u.user_nome, CONCAT('Usuário #', r.user_id)) AS user_name,
         r.remarks AS description,
         r.amount
       FROM running_balance r
       LEFT JOIN usuarios u ON u.user_id = r.user_id
       ${joins}
       WHERE r.aj = 1
         AND r.status = ?
         AND r.date_created BETWEEN ? AND ?
         ${groupFilter}
       ORDER BY r.date_created DESC`,
      ...params,
    );

    const items = rows.map((row) => ({
      id: numberValue(row.id),
      createdAt: row.created_at,
      userName: row.user_name ?? 'Usuário não identificado',
      description: row.description ?? '',
      amount: numberValue(row.amount),
    }));

    return {
      filter: {
        startDate: period.startDate,
        endDate: period.endDate,
        status: input.status,
        group: input.group,
        key: input.key,
      },
      total: items.reduce((sum, item) => sum + item.amount, 0),
      items,
    };
  }

  private async period(
    startDate: string | undefined,
    endDate: string | undefined,
  ): Promise<{ startDate: string; endDate: string }> {
    const rows = await this.database.$queryRawUnsafe<ClockRow[]>(
      `SELECT
         DATE_FORMAT(CURDATE(), '%Y-%m-01') AS period_start,
         DATE_FORMAT(LAST_DAY(CURDATE()), '%Y-%m-%d') AS period_end`,
    );
    const clock = rows[0];
    const fallbackStart =
      clock?.period_start ?? `${new Date().toISOString().slice(0, 8)}01`;
    const fallbackEnd = clock?.period_end ?? fallbackStart;

    return {
      startDate: startDate ?? fallbackStart,
      endDate: endDate ?? fallbackEnd,
    };
  }

  private totals(start: string, end: string): Promise<TotalsRow[]> {
    return this.database.$queryRawUnsafe<TotalsRow[]>(
      `SELECT
         COALESCE(SUM(CASE WHEN r.status = 1 THEN r.amount ELSE 0 END), 0)
           AS global_pending,
         COALESCE(SUM(CASE WHEN r.status = 2 THEN r.amount ELSE 0 END), 0)
           AS global_approved,
         COALESCE(SUM(CASE WHEN r.status = 2 THEN 1 ELSE 0 END), 0)
           AS global_approved_count,
         COALESCE(SUM(CASE
           WHEN r.status = 1 AND r.date_created BETWEEN ? AND ? THEN r.amount
           ELSE 0
         END), 0) AS period_pending,
         COALESCE(SUM(CASE
           WHEN r.status = 2 AND r.date_created BETWEEN ? AND ? THEN r.amount
           ELSE 0
         END), 0) AS period_approved,
         COALESCE(SUM(CASE
           WHEN r.status = 4 AND r.date_created BETWEEN ? AND ? THEN r.amount
           ELSE 0
         END), 0) AS period_paid,
         COALESCE(SUM(CASE
           WHEN r.status = 1 AND r.date_created BETWEEN ? AND ? THEN 1
           ELSE 0
         END), 0) AS period_pending_count,
         COALESCE(SUM(CASE
           WHEN r.status = 2 AND r.date_created BETWEEN ? AND ? THEN 1
           ELSE 0
         END), 0) AS period_approved_count,
         COALESCE(SUM(CASE
           WHEN r.status = 4 AND r.date_created BETWEEN ? AND ? THEN 1
           ELSE 0
         END), 0) AS period_paid_count
       FROM running_balance r
       WHERE r.aj = 1`,
      start,
      end,
      start,
      end,
      start,
      end,
      start,
      end,
      start,
      end,
      start,
      end,
    );
  }

  private groups(
    status: LogisticsExpenseAdminStatus,
    start: string,
    end: string,
  ): Promise<BreakdownRow[]> {
    return this.database.$queryRawUnsafe<BreakdownRow[]>(
      `SELECT
         grouped.group_key,
         grouped.label,
         SUM(grouped.amount) AS amount,
         SUM(grouped.item_count) AS count
       FROM (
         SELECT
           '__legacy__' AS group_key,
           'Legado / Sem grupo' AS label,
           r.amount,
           1 AS item_count
         FROM running_balance r
         WHERE r.status = ?
           AND r.aj = 1
           AND r.date_created BETWEEN ? AND ?
           AND r.date_created < '2025-10-01 00:00:00'

         UNION ALL

         SELECT
           g.nome AS group_key,
           g.nome AS label,
           r.amount,
           1 AS item_count
         FROM running_balance r
         JOIN categorias_subgrupo sg ON sg.id = r.category_id
         JOIN categorias_grupo g ON g.id = sg.id_grupo
         WHERE r.status = ?
           AND r.aj = 1
           AND sg.aplicavel IN ('Ambos', 'RD')
           AND r.date_created BETWEEN ? AND ?
           AND r.date_created >= '2025-10-01 00:00:00'
       ) grouped
       GROUP BY grouped.group_key, grouped.label
       ORDER BY amount DESC, label ASC`,
      status,
      start,
      end,
      status,
      start,
      end,
    );
  }

  private categories(
    status: LogisticsExpenseAdminStatus,
    start: string,
    end: string,
  ): Promise<BreakdownRow[]> {
    return this.database.$queryRawUnsafe<BreakdownRow[]>(
      `SELECT
         grouped.category_name AS group_key,
         grouped.category_name AS label,
         SUM(grouped.amount) AS amount,
         SUM(grouped.item_count) AS count
       FROM (
         SELECT c.categories AS category_name, r.amount, 1 AS item_count
         FROM running_balance r
         JOIN category c ON c.id = r.category_id
         WHERE r.status = ?
           AND r.aj = 1
           AND r.date_created BETWEEN ? AND ?
           AND r.date_created < '2025-10-01 00:00:00'

         UNION ALL

         SELECT c.nome AS category_name, r.amount, 1 AS item_count
         FROM running_balance r
         JOIN categorias_subgrupo c ON c.id = r.category_id
         WHERE r.status = ?
           AND r.aj = 1
           AND c.aplicavel IN ('Ambos', 'RD')
           AND r.date_created BETWEEN ? AND ?
           AND r.date_created >= '2025-10-01 00:00:00'
       ) grouped
       GROUP BY grouped.category_name
       ORDER BY amount DESC, label ASC`,
      status,
      start,
      end,
      status,
      start,
      end,
    );
  }

  private clients(
    status: LogisticsExpenseAdminStatus,
    start: string,
    end: string,
  ): Promise<BreakdownRow[]> {
    return this.database.$queryRawUnsafe<BreakdownRow[]>(
      `SELECT
         COALESCE(r.cliente, '') AS group_key,
         COALESCE(NULLIF(r.cliente, ''), 'Sem cliente') AS label,
         SUM(r.amount) AS amount,
         COUNT(*) AS count
       FROM running_balance r
       WHERE r.status = ?
         AND r.aj = 1
         AND r.date_created BETWEEN ? AND ?
       GROUP BY r.cliente
       ORDER BY amount DESC, label ASC`,
      status,
      start,
      end,
    );
  }

  private collaborators(
    status: LogisticsExpenseAdminStatus,
    start: string,
    end: string,
  ): Promise<BreakdownRow[]> {
    return this.database.$queryRawUnsafe<BreakdownRow[]>(
      `SELECT
         CAST(r.user_id AS CHAR) AS group_key,
         COALESCE(u.user_nome, CONCAT('Usuário #', r.user_id)) AS label,
         SUM(r.amount) AS amount,
         COUNT(*) AS count
       FROM running_balance r
       LEFT JOIN usuarios u ON u.user_id = r.user_id
       WHERE r.status = ?
         AND r.aj = 1
         AND r.date_created BETWEEN ? AND ?
       GROUP BY r.user_id, u.user_nome
       ORDER BY amount DESC, label ASC`,
      status,
      start,
      end,
    );
  }

  private timeline(
    status: LogisticsExpenseAdminStatus,
    start: string,
    end: string,
  ): Promise<TimelineRow[]> {
    return this.database.$queryRawUnsafe<TimelineRow[]>(
      `SELECT
         DATE_FORMAT(r.date_created, '%Y-%m-%d') AS day,
         SUM(r.amount) AS amount,
         COUNT(*) AS count
       FROM running_balance r
       WHERE r.status = ?
         AND r.aj = 1
         AND r.date_created BETWEEN ? AND ?
       GROUP BY DATE(r.date_created)
       ORDER BY DATE(r.date_created) ASC`,
      status,
      start,
      end,
    );
  }

  private breakdown(rows: BreakdownRow[]): LogisticsExpenseAdminBreakdownItem[] {
    return rows.map((row) => ({
      key: row.group_key === null ? '' : String(row.group_key),
      label: row.label ?? 'Não informado',
      amount: numberValue(row.amount),
      count: numberValue(row.count),
    }));
  }
}

import { Inject, Injectable } from '@nestjs/common';
import {
  PermissionScope,
  type LogisticsExpenseComparisonGroup,
  type LogisticsExpenseComparisonPeriod,
  type LogisticsExpenseComparisonResponse,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import type { ExpenseComparisonQuery } from '../application/expense-comparison.service';

interface ComparisonClockRow {
  period1_start: string;
  period1_end: string;
  period2_start: string;
  period2_end: string;
}

interface ComparisonTotalRow {
  period1_amount: bigint | number | string | null;
  period2_amount: bigint | number | string | null;
}

interface ComparisonGroupRow {
  label: string | null;
  period1_amount: bigint | number | string | null;
  period2_amount: bigint | number | string | null;
}

type QueryParam = number | string;

function numberValue(value: bigint | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function variationPercent(current: number, previous: number): number {
  if (previous > 0) return ((current - previous) / previous) * 100;
  if (current > 0) return 100;
  return 0;
}

function fallbackPeriod(monthOffset: number): LogisticsExpenseComparisonPeriod {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset + 1, 0),
  );
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

@Injectable()
export class ExpenseComparisonRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async compare(
    input: ExpenseComparisonQuery,
  ): Promise<LogisticsExpenseComparisonResponse> {
    const periods = await this.periods(input);
    const scope = this.scopeFilter(input.scope, input.actorUserId);
    const params = this.params(periods, scope.params);

    const [totalRows, categoryRows, clientRows] = await Promise.all([
      this.database.$queryRawUnsafe<ComparisonTotalRow[]>(
        `SELECT
           COALESCE(SUM(
             CASE WHEN r.date_created BETWEEN ? AND ? THEN r.amount ELSE 0 END
           ), 0) AS period1_amount,
           COALESCE(SUM(
             CASE WHEN r.date_created BETWEEN ? AND ? THEN r.amount ELSE 0 END
           ), 0) AS period2_amount
         FROM running_balance r
         WHERE r.status = 4
           AND r.aj = 1
           AND (
             r.date_created BETWEEN ? AND ?
             OR r.date_created BETWEEN ? AND ?
           )
           ${scope.sql}`,
        ...params,
      ),
      this.database.$queryRawUnsafe<ComparisonGroupRow[]>(
        `SELECT
           COALESCE(
             CASE
               WHEN r.date_created < '2025-10-01 00:00:00'
                 THEN legacy_category.categories
               ELSE current_category.nome
             END,
             CONCAT('Categoria #', r.category_id)
           ) AS label,
           COALESCE(SUM(
             CASE WHEN r.date_created BETWEEN ? AND ? THEN r.amount ELSE 0 END
           ), 0) AS period1_amount,
           COALESCE(SUM(
             CASE WHEN r.date_created BETWEEN ? AND ? THEN r.amount ELSE 0 END
           ), 0) AS period2_amount
         FROM running_balance r
         LEFT JOIN category legacy_category
           ON legacy_category.id = r.category_id
         LEFT JOIN categorias_subgrupo current_category
           ON current_category.id = r.category_id
         WHERE r.status = 4
           AND r.aj = 1
           AND (
             r.date_created BETWEEN ? AND ?
             OR r.date_created BETWEEN ? AND ?
           )
           ${scope.sql}
         GROUP BY label
         ORDER BY period2_amount DESC, label ASC`,
        ...params,
      ),
      this.database.$queryRawUnsafe<ComparisonGroupRow[]>(
        `SELECT
           COALESCE(NULLIF(TRIM(r.cliente), ''), 'Sem cliente') AS label,
           COALESCE(SUM(
             CASE WHEN r.date_created BETWEEN ? AND ? THEN r.amount ELSE 0 END
           ), 0) AS period1_amount,
           COALESCE(SUM(
             CASE WHEN r.date_created BETWEEN ? AND ? THEN r.amount ELSE 0 END
           ), 0) AS period2_amount
         FROM running_balance r
         WHERE r.status = 4
           AND r.aj = 1
           AND (
             r.date_created BETWEEN ? AND ?
             OR r.date_created BETWEEN ? AND ?
           )
           ${scope.sql}
         GROUP BY label
         ORDER BY period2_amount DESC, label ASC`,
        ...params,
      ),
    ]);

    const total = totalRows[0];
    const period1Amount = numberValue(total?.period1_amount);
    const period2Amount = numberValue(total?.period2_amount);

    return {
      scope: input.scope,
      periods,
      totals: {
        period1Amount,
        period2Amount,
        difference: period2Amount - period1Amount,
        variationPercent: variationPercent(period2Amount, period1Amount),
      },
      categories: this.groups(categoryRows),
      clients: this.groups(clientRows),
    };
  }

  private async periods(
    input: ExpenseComparisonQuery,
  ): Promise<{
    period1: LogisticsExpenseComparisonPeriod;
    period2: LogisticsExpenseComparisonPeriod;
  }> {
    const rows = await this.database.$queryRawUnsafe<ComparisonClockRow[]>(
      `SELECT
         DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
           AS period1_start,
         DATE_FORMAT(LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)), '%Y-%m-%d')
           AS period1_end,
         DATE_FORMAT(CURDATE(), '%Y-%m-01') AS period2_start,
         DATE_FORMAT(LAST_DAY(CURDATE()), '%Y-%m-%d') AS period2_end`,
    );
    const clock = rows[0];
    const previousFallback = fallbackPeriod(-1);
    const currentFallback = fallbackPeriod(0);

    const first = {
      startDate:
        input.period1Start ?? clock?.period1_start ?? previousFallback.startDate,
      endDate: input.period1End ?? clock?.period1_end ?? previousFallback.endDate,
    };
    const second = {
      startDate:
        input.period2Start ?? clock?.period2_start ?? currentFallback.startDate,
      endDate: input.period2End ?? clock?.period2_end ?? currentFallback.endDate,
    };

    return first.startDate > second.startDate
      ? { period1: second, period2: first }
      : { period1: first, period2: second };
  }

  private scopeFilter(
    scope: PermissionScope,
    actorUserId: number,
  ): { sql: string; params: QueryParam[] } {
    return scope === PermissionScope.All
      ? { sql: '', params: [] }
      : { sql: ' AND r.user_id = ?', params: [actorUserId] };
  }

  private params(
    periods: {
      period1: LogisticsExpenseComparisonPeriod;
      period2: LogisticsExpenseComparisonPeriod;
    },
    scopeParams: QueryParam[],
  ): QueryParam[] {
    const period1Start = `${periods.period1.startDate} 00:00:00`;
    const period1End = `${periods.period1.endDate} 23:59:59`;
    const period2Start = `${periods.period2.startDate} 00:00:00`;
    const period2End = `${periods.period2.endDate} 23:59:59`;
    return [
      period1Start,
      period1End,
      period2Start,
      period2End,
      period1Start,
      period1End,
      period2Start,
      period2End,
      ...scopeParams,
    ];
  }

  private groups(rows: ComparisonGroupRow[]): LogisticsExpenseComparisonGroup[] {
    return rows.map((row) => {
      const period1Amount = numberValue(row.period1_amount);
      const period2Amount = numberValue(row.period2_amount);
      return {
        label: row.label ?? 'Não identificado',
        period1Amount,
        period2Amount,
        difference: period2Amount - period1Amount,
        variationPercent: variationPercent(period2Amount, period1Amount),
      };
    });
  }
}

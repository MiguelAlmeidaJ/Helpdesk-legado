import { Inject, Injectable } from '@nestjs/common';
import type {
  LogisticsExpenseDashboardItem,
  LogisticsExpenseDashboardPeriod,
  LogisticsExpenseDashboardResponse,
  LogisticsExpenseDashboardTotals,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

interface ClockRow {
  period_start: string;
  period_end: string;
  generated_at: string;
}

interface TotalsRow {
  awaiting_approval: bigint | number | string | null;
  approved_for_payment: bigint | number | string | null;
  received_in_period: bigint | number | string | null;
}

interface ExpenseRow {
  id: number;
  client_name: string | null;
  expense_date: string;
  category_name: string | null;
  amount: bigint | number | string | null;
}

function numberValue(value: bigint | number | string | null): number {
  if (value === null) return 0;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatBr(value: string): string {
  const year = value.slice(0, 4);
  const month = value.slice(5, 7);
  const day = value.slice(8, 10);
  return `${day}/${month}/${year}`;
}

@Injectable()
export class ExpenseDashboardRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async get(input: {
    userId: number;
    userName: string;
    startDate?: string;
    endDate?: string;
  }): Promise<LogisticsExpenseDashboardResponse> {
    const clockRows = await this.database.$queryRawUnsafe<ClockRow[]>(
      `SELECT
         DATE_FORMAT(CURDATE(), '%Y-%m-01') AS period_start,
         DATE_FORMAT(LAST_DAY(CURDATE()), '%Y-%m-%d') AS period_end,
         DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s') AS generated_at`,
    );
    const clock = clockRows[0];

    const fallbackStart =
      clock?.period_start ?? `${new Date().toISOString().slice(0, 8)}01`;
    const fallbackEnd = clock?.period_end ?? fallbackStart;
    const startDate = input.startDate ?? fallbackStart;
    const endDate = input.endDate ?? fallbackEnd;
    const startDateTime = `${startDate} 00:00:00`;
    const endDateTime = `${endDate} 23:59:59`;

    const [totalRows, latestRows] = await Promise.all([
      this.database.$queryRawUnsafe<TotalsRow[]>(
        `SELECT
           COALESCE(SUM(CASE WHEN status = 1 THEN amount ELSE 0 END), 0)
             AS awaiting_approval,
           COALESCE(SUM(CASE WHEN status = 2 THEN amount ELSE 0 END), 0)
             AS approved_for_payment,
           COALESCE(
             SUM(
               CASE
                 WHEN status = 4 AND date_created BETWEEN ? AND ?
                   THEN amount
                 ELSE 0
               END
             ),
             0
           ) AS received_in_period
         FROM running_balance
         WHERE user_id = ?`,
        startDateTime,
        endDateTime,
        input.userId,
      ),
      this.database.$queryRawUnsafe<ExpenseRow[]>(
        `SELECT
           r.id,
           r.cliente AS client_name,
           DATE_FORMAT(r.date_created, '%Y-%m-%d') AS expense_date,
           c.categories AS category_name,
           r.amount
         FROM running_balance r
         JOIN category c ON c.id = r.category_id
         WHERE r.status = 4
           AND r.aj = 1
           AND r.user_id = ?
           AND r.date_created BETWEEN ? AND ?
         ORDER BY r.date_created DESC
         LIMIT 10`,
        input.userId,
        startDateTime,
        endDateTime,
      ),
    ]);

    const totalsRow = totalRows[0];
    const totals: LogisticsExpenseDashboardTotals = {
      awaitingApproval: numberValue(totalsRow?.awaiting_approval ?? null),
      approvedForPayment: numberValue(
        totalsRow?.approved_for_payment ?? null,
      ),
      receivedInPeriod: numberValue(totalsRow?.received_in_period ?? null),
    };

    const latestReceived: LogisticsExpenseDashboardItem[] = latestRows.map(
      (row) => ({
        id: Number(row.id),
        clientName: row.client_name?.trim() || 'Não informado',
        date: row.expense_date,
        categoryName: row.category_name?.trim() || 'Não informada',
        amount: numberValue(row.amount),
      }),
    );

    const period: LogisticsExpenseDashboardPeriod = {
      startDate,
      endDate,
      label: `${formatBr(startDate)} - ${formatBr(endDate)}`,
    };

    return {
      generatedAt: clock?.generated_at ?? new Date().toISOString(),
      userName: input.userName,
      period,
      totals,
      latestReceived,
    };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import {
  PermissionScope,
  type LogisticsExpensePaidReportFilterOption,
  type LogisticsExpensePaidReportResponse,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import type { ExpensePaidReportQuery } from '../application/expense-paid-report.service';

interface ClockRow {
  period_start: string;
  period_end: string;
}

interface PaidReportRow {
  id: bigint | number | string;
  created_at: string;
  paid_at: string;
  user_id: bigint | number | string;
  user_name: string | null;
  category_id: bigint | number | string | null;
  category_name: string | null;
  clt_id: bigint | number | string | null;
  client_name: string | null;
  remarks: string | null;
  amount: bigint | number | string | null;
}

interface OptionRow {
  value: bigint | number | string | null;
  label: string | null;
}

type QueryParam = number | string;

function numberValue(value: bigint | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function integerOrNull(
  value: bigint | number | string | null | undefined,
): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

@Injectable()
export class ExpensePaidReportRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async report(
    input: ExpensePaidReportQuery,
  ): Promise<LogisticsExpensePaidReportResponse> {
    const period = await this.period(input.startDate, input.endDate);
    const start = `${period.startDate} 00:00:00`;
    const end = `${period.endDate} 23:59:59`;
    const { sql: scopeSql, params: scopeParams } = this.scopeFilter(
      input.scope,
      input.actorUserId,
      input.userId,
    );
    const params: QueryParam[] = [start, end, ...scopeParams];
    let filtersSql = scopeSql;

    const normalizedClientName = input.clientName?.trim() ?? '';
    if (normalizedClientName) {
      filtersSql += ' AND r.cliente = ?';
      params.push(normalizedClientName);
    }

    if (input.categoryIds.length > 0) {
      filtersSql += ` AND r.category_id IN (${input.categoryIds
        .map(() => '?')
        .join(', ')})`;
      params.push(...input.categoryIds);
    }

    const [rows, collaborators, clients, categories] = await Promise.all([
      this.database.$queryRawUnsafe<PaidReportRow[]>(
        `SELECT
           r.id,
           DATE_FORMAT(r.date_created, '%Y-%m-%dT%H:%i:%s') AS created_at,
           DATE_FORMAT(COALESCE(r.date_updated, r.date_created), '%Y-%m-%dT%H:%i:%s') AS paid_at,
           r.user_id,
           COALESCE(u.user_nome, CONCAT('Usuário #', r.user_id)) AS user_name,
           r.category_id,
           COALESCE(
             CASE
               WHEN r.date_created < '2025-10-01 00:00:00' THEN legacy_category.categories
               ELSE current_category.nome
             END,
             CONCAT('Categoria #', r.category_id)
           ) AS category_name,
           r.clt_id,
           COALESCE(NULLIF(r.cliente, ''), 'Sem cliente') AS client_name,
           r.remarks,
           r.amount
         FROM running_balance r
         LEFT JOIN usuarios u ON u.user_id = r.user_id
         LEFT JOIN category legacy_category ON legacy_category.id = r.category_id
         LEFT JOIN categorias_subgrupo current_category ON current_category.id = r.category_id
         WHERE r.status = 4
           AND r.aj = 1
           AND r.date_created BETWEEN ? AND ?
           ${filtersSql}
         ORDER BY r.date_created ASC, r.id ASC`,
        ...params,
      ),
      this.collaboratorOptions(start, end, input.scope, input.actorUserId),
      this.clientOptions(start, end, input.scope, input.actorUserId),
      this.categoryOptions(start, end, input.scope, input.actorUserId),
    ]);

    const items = rows.map((row) => ({
      id: numberValue(row.id),
      createdAt: row.created_at,
      paidAt: row.paid_at,
      userId: numberValue(row.user_id),
      userName: row.user_name ?? 'Usuário não identificado',
      categoryId: integerOrNull(row.category_id),
      categoryName: row.category_name ?? 'Categoria não identificada',
      clientId: integerOrNull(row.clt_id),
      clientName: row.client_name ?? 'Sem cliente',
      remarks: row.remarks ?? '',
      amount: numberValue(row.amount),
    }));

    return {
      period,
      scope: input.scope,
      filters: {
        userId:
          input.scope === PermissionScope.All
            ? (input.userId ?? null)
            : input.actorUserId,
        clientName: normalizedClientName,
        categoryIds: [...input.categoryIds],
      },
      options: {
        collaborators: this.options(collaborators),
        clients: this.options(clients),
        categories: this.options(categories),
      },
      count: items.length,
      totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
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

  private scopeFilter(
    scope: PermissionScope,
    actorUserId: number,
    requestedUserId?: number,
  ): { sql: string; params: QueryParam[] } {
    if (scope !== PermissionScope.All) {
      return { sql: ' AND r.user_id = ?', params: [actorUserId] };
    }
    if (requestedUserId) {
      return { sql: ' AND r.user_id = ?', params: [requestedUserId] };
    }
    return { sql: '', params: [] };
  }

  private optionScope(
    scope: PermissionScope,
    actorUserId: number,
  ): { sql: string; params: QueryParam[] } {
    return scope === PermissionScope.All
      ? { sql: '', params: [] }
      : { sql: ' AND r.user_id = ?', params: [actorUserId] };
  }

  private collaboratorOptions(
    start: string,
    end: string,
    scope: PermissionScope,
    actorUserId: number,
  ): Promise<OptionRow[]> {
    const actor = this.optionScope(scope, actorUserId);
    return this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT
         CAST(r.user_id AS CHAR) AS value,
         COALESCE(u.user_nome, CONCAT('Usuário #', r.user_id)) AS label
       FROM running_balance r
       LEFT JOIN usuarios u ON u.user_id = r.user_id
       WHERE r.status = 4
         AND r.aj = 1
         AND r.date_created BETWEEN ? AND ?
         ${actor.sql}
       GROUP BY r.user_id, u.user_nome
       ORDER BY label ASC`,
      start,
      end,
      ...actor.params,
    );
  }

  private clientOptions(
    start: string,
    end: string,
    scope: PermissionScope,
    actorUserId: number,
  ): Promise<OptionRow[]> {
    const actor = this.optionScope(scope, actorUserId);
    return this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT
         r.cliente AS value,
         r.cliente AS label
       FROM running_balance r
       WHERE r.status = 4
         AND r.aj = 1
         AND r.date_created BETWEEN ? AND ?
         AND r.cliente IS NOT NULL
         AND r.cliente <> ''
         ${actor.sql}
       GROUP BY r.cliente
       ORDER BY label ASC`,
      start,
      end,
      ...actor.params,
    );
  }

  private categoryOptions(
    start: string,
    end: string,
    scope: PermissionScope,
    actorUserId: number,
  ): Promise<OptionRow[]> {
    const actor = this.optionScope(scope, actorUserId);
    return this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT
         CAST(r.category_id AS CHAR) AS value,
         MAX(
           COALESCE(
             CASE
               WHEN r.date_created < '2025-10-01 00:00:00' THEN legacy_category.categories
               ELSE current_category.nome
             END,
             CONCAT('Categoria #', r.category_id)
           )
         ) AS label
       FROM running_balance r
       LEFT JOIN category legacy_category ON legacy_category.id = r.category_id
       LEFT JOIN categorias_subgrupo current_category ON current_category.id = r.category_id
       WHERE r.status = 4
         AND r.aj = 1
         AND r.category_id IS NOT NULL
         AND r.date_created BETWEEN ? AND ?
         ${actor.sql}
       GROUP BY r.category_id
       ORDER BY label ASC`,
      start,
      end,
      ...actor.params,
    );
  }

  private options(rows: OptionRow[]): LogisticsExpensePaidReportFilterOption[] {
    return rows
      .filter((row) => row.value !== null && row.label !== null)
      .map((row) => ({
        value: String(row.value),
        label: row.label ?? '',
      }));
  }
}

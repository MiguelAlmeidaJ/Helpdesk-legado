import { Inject, Injectable } from '@nestjs/common';
import type {
  LogisticsExpensePaymentGroup,
  LogisticsExpensePaymentItem,
  LogisticsExpensePaymentQueueResponse,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

interface PaymentRow {
  id: number | bigint | string;
  status: number | bigint | string;
  date_created: string;
  category_name: string | null;
  cliente: string | null;
  user_id: number | bigint | string;
  user_name: string | null;
  amount: number | bigint | string | null;
  user_remarks: string | null;
  approval_remarks: string | null;
  pix: string | null;
  pix_type: number | bigint | string | null;
  pix_type_name: string | null;
}

export type ExpensePaymentMutationResult =
  | { kind: 'paid'; ids: number[] }
  | { kind: 'rejected'; ids: number[] }
  | { kind: 'not-found'; ids: number[] }
  | { kind: 'not-approved'; ids: number[] };

function numberValue(value: number | bigint | string | null): number {
  if (value === null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function integerOrNull(
  value: number | bigint | string | null,
): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function normalizePix(value: string | null, typeId: number | null): string {
  const pix = value?.trim() ?? '';
  return typeId === 1 || typeId === 2 || typeId === 4
    ? pix.replace(/\D/g, '')
    : pix;
}

const PAYMENT_SELECT = `SELECT
  r.id,
  r.status,
  DATE_FORMAT(r.date_created, '%Y-%m-%dT%H:%i:%s') AS date_created,
  COALESCE(
    CASE
      WHEN r.date_created < '2025-10-01 00:00:00' THEN legacy_category.categories
      ELSE current_category.nome
    END,
    CONCAT('Categoria #', r.category_id)
  ) AS category_name,
  r.cliente,
  r.user_id,
  COALESCE(u.user_nome, CONCAT('Usuário #', r.user_id)) AS user_name,
  r.amount,
  r.remarks AS user_remarks,
  COALESCE(r.remark_aprov, '') AS approval_remarks,
  r.pix,
  r.pix_type,
  COALESCE(tk.name_type, '') AS pix_type_name
FROM running_balance r
JOIN usuarios u ON u.user_id = r.user_id
LEFT JOIN category legacy_category
  ON legacy_category.id = r.category_id
 AND r.date_created < '2025-10-01 00:00:00'
LEFT JOIN categorias_subgrupo current_category
  ON current_category.id = r.category_id
 AND r.date_created >= '2025-10-01 00:00:00'
 AND current_category.aplicavel IN ('Ambos', 'RD')
LEFT JOIN type_keys tk ON tk.id = r.pix_type`;

@Injectable()
export class ExpensePaymentRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async queue(): Promise<LogisticsExpensePaymentQueueResponse> {
    const rows = await this.database.$queryRawUnsafe<PaymentRow[]>(
      `${PAYMENT_SELECT}
       WHERE r.status = 2
         AND r.aj = 1
       ORDER BY r.user_id ASC, r.date_created ASC, r.id ASC`,
    );
    const items = rows.map((row) => this.item(row));
    const groups = this.groups(items);

    return {
      count: items.length,
      totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
      groups,
    };
  }

  pay(
    payerId: number,
    expenseId: number,
    remarks: string,
  ): Promise<ExpensePaymentMutationResult> {
    return this.changeStatus({
      payerId,
      expenseId,
      targetStatus: 4,
      remarks: remarks || 'Pagamento Efetuado',
      successKind: 'paid',
    });
  }

  reject(
    payerId: number,
    expenseId: number,
    remarks: string,
  ): Promise<ExpensePaymentMutationResult> {
    return this.changeStatus({
      payerId,
      expenseId,
      targetStatus: 3,
      remarks: remarks || 'Pagamento Recusado',
      successKind: 'rejected',
    });
  }

  payBatch(
    payerId: number,
    entries: Array<{ id: number; remarks: string }>,
  ): Promise<ExpensePaymentMutationResult> {
    const ordered = [...entries].sort((left, right) => left.id - right.id);
    const ids = ordered.map((entry) => entry.id);
    const remarksById = new Map(
      ordered.map((entry) => [entry.id, entry.remarks || 'Pagamento Efetuado']),
    );

    return this.database.$transaction(async (transaction) => {
      const placeholders = ids.map(() => '?').join(',');
      const rows = await transaction.$queryRawUnsafe<PaymentRow[]>(
        `${PAYMENT_SELECT}
         WHERE r.id IN (${placeholders})
           AND r.aj = 1
         ORDER BY r.id ASC
         FOR UPDATE`,
        ...ids,
      );
      const foundIds = new Set(rows.map((row) => numberValue(row.id)));
      const missing = ids.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        return { kind: 'not-found', ids: missing } as const;
      }

      const notApproved = rows
        .filter((row) => numberValue(row.status) !== 2)
        .map((row) => numberValue(row.id));
      if (notApproved.length > 0) {
        return { kind: 'not-approved', ids: notApproved } as const;
      }

      for (const id of ids) {
        await transaction.$executeRawUnsafe(
          `UPDATE running_balance
           SET status = 4,
               date_updated = NOW(),
               pagador_id = ?,
               remark_pagador = ?
           WHERE id = ? AND status = 2 AND aj = 1`,
          payerId,
          remarksById.get(id) ?? 'Pagamento Efetuado',
          id,
        );
      }

      return { kind: 'paid', ids } as const;
    });
  }

  private changeStatus(input: {
    payerId: number;
    expenseId: number;
    targetStatus: 3 | 4;
    remarks: string;
    successKind: 'paid' | 'rejected';
  }): Promise<ExpensePaymentMutationResult> {
    return this.database.$transaction(async (transaction) => {
      const rows = await transaction.$queryRawUnsafe<PaymentRow[]>(
        `${PAYMENT_SELECT}
         WHERE r.id = ?
           AND r.aj = 1
         LIMIT 1
         FOR UPDATE`,
        input.expenseId,
      );
      const row = rows[0];
      if (!row) {
        return { kind: 'not-found', ids: [input.expenseId] } as const;
      }
      if (numberValue(row.status) !== 2) {
        return { kind: 'not-approved', ids: [input.expenseId] } as const;
      }

      await transaction.$executeRawUnsafe(
        `UPDATE running_balance
         SET status = ?,
             date_updated = NOW(),
             pagador_id = ?,
             remark_pagador = ?
         WHERE id = ? AND status = 2 AND aj = 1`,
        input.targetStatus,
        input.payerId,
        input.remarks,
        input.expenseId,
      );

      return {
        kind: input.successKind,
        ids: [input.expenseId],
      } as ExpensePaymentMutationResult;
    });
  }

  private item(row: PaymentRow): LogisticsExpensePaymentItem {
    const pixTypeId = integerOrNull(row.pix_type);

    return {
      id: numberValue(row.id),
      createdAt: row.date_created,
      categoryName: row.category_name ?? 'Não informada',
      clientName: row.cliente?.trim() || 'Não informado',
      userId: numberValue(row.user_id),
      userName: row.user_name ?? `Usuário #${row.user_id}`,
      amount: numberValue(row.amount),
      userRemarks: row.user_remarks ?? '',
      approvalRemarks: row.approval_remarks ?? '',
      pix: normalizePix(row.pix, pixTypeId),
      pixTypeId,
      pixTypeName: row.pix_type_name ?? '',
    };
  }

  private groups(
    items: LogisticsExpensePaymentItem[],
  ): LogisticsExpensePaymentGroup[] {
    const grouped = new Map<string, LogisticsExpensePaymentItem[]>();

    for (const item of items) {
      const key = `${item.userId}:${item.pix}`;
      const group = grouped.get(key);
      if (group) group.push(item);
      else grouped.set(key, [item]);
    }

    return [...grouped.entries()].map(([key, groupItems]) => {
      const first = groupItems[0]!;
      const descriptions = groupItems
        .filter((item) => item.userRemarks.trim())
        .map((item) => `#${item.id} - ${item.userRemarks.trim()}`);
      const preview = descriptions.slice(0, 3).join(' | ');
      const extra = Math.max(0, descriptions.length - 3);

      return {
        key,
        userId: first.userId,
        userName: first.userName,
        pix: first.pix,
        pixTypeId: first.pixTypeId,
        pixTypeName: first.pixTypeName,
        totalAmount: groupItems.reduce((sum, item) => sum + item.amount, 0),
        itemCount: groupItems.length,
        descriptionPreview:
          (preview || 'Sem descrição informada.') +
          (extra > 0 ? ` +${extra} descrição(ões)` : ''),
        items: groupItems,
      };
    });
  }
}

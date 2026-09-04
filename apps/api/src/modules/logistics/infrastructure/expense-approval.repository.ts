import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import type {
  LogisticsExpenseApprovalAttachment,
  LogisticsExpenseApprovalItem,
  LogisticsExpenseApprovalQueueResponse,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

interface AttachmentJson {
  id?: string;
  nome?: string;
  fileName?: string;
  storagePath?: string;
  url?: string;
  mimeType?: string;
}

export interface ExpenseApprovalAttachmentContent {
  name: string;
  mimeType: string;
  data: Buffer;
}

interface ApprovalRow {
  id: number | bigint | string;
  status: number | bigint | string;
  date_created: string;
  category_id: number | bigint | string;
  category_name: string | null;
  cliente: string | null;
  user_id: number | bigint | string;
  user_name: string | null;
  amount: number | bigint | string | null;
  remarks: string | null;
  pix: string | null;
  pix_type: number | bigint | string | null;
  pix_type_name: string | null;
  anexos: string | null;
}

export type ExpenseApprovalMutationResult =
  | { kind: 'approved'; items: LogisticsExpenseApprovalItem[] }
  | { kind: 'rejected'; ids: number[] }
  | { kind: 'not-found'; ids: number[] }
  | { kind: 'not-pending'; ids: number[] };

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

function parseAttachments(value: string | null): AttachmentJson[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is AttachmentJson =>
            Boolean(item) && typeof item === 'object',
        )
      : [];
  } catch {
    return [];
  }
}

const APPROVAL_SELECT = `SELECT
  r.id,
  r.status,
  DATE_FORMAT(r.date_created, '%Y-%m-%dT%H:%i:%s') AS date_created,
  r.category_id,
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
  r.remarks,
  r.pix,
  r.pix_type,
  COALESCE(tk.name_type, '') AS pix_type_name,
  r.anexos
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
export class ExpenseApprovalRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async queue(): Promise<LogisticsExpenseApprovalQueueResponse> {
    const rows = await this.database.$queryRawUnsafe<ApprovalRow[]>(
      `${APPROVAL_SELECT}
       WHERE r.status = 1
         AND r.aj = 1
       ORDER BY r.date_created ASC, r.id ASC`,
    );
    const items = rows.map((row) => this.item(row));

    return {
      count: items.length,
      totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
      items,
    };
  }


  async attachmentContent(
    expenseId: number,
    attachmentKey: string,
  ): Promise<ExpenseApprovalAttachmentContent | null> {
    const rows = await this.database.$queryRawUnsafe<{ anexos: string | null }[]>(
      `SELECT anexos
       FROM running_balance
       WHERE id = ? AND status = 1 AND aj = 1
       LIMIT 1`,
      expenseId,
    );
    const attachments = parseAttachments(rows[0]?.anexos ?? null);
    const attachment = this.attachment(attachments, attachmentKey);
    if (!attachment) return null;

    const physical = this.physicalPath(attachment);
    if (!physical) return null;

    try {
      return {
        name:
          attachment.nome ??
          attachment.fileName ??
          `comprovante-${expenseId}.pdf`,
        mimeType: attachment.mimeType ?? 'application/pdf',
        data: await readFile(physical),
      };
    } catch {
      return null;
    }
  }

  approve(
    approverId: number,
    expenseId: number,
    remarks: string,
  ): Promise<ExpenseApprovalMutationResult> {
    return this.database.$transaction(async (transaction) => {
      const rows = await transaction.$queryRawUnsafe<ApprovalRow[]>(
        `${APPROVAL_SELECT}
         WHERE r.id = ?
           AND r.aj = 1
         LIMIT 1
         FOR UPDATE`,
        expenseId,
      );
      const row = rows[0];
      if (!row) return { kind: 'not-found', ids: [expenseId] } as const;
      if (numberValue(row.status) !== 1) {
        return { kind: 'not-pending', ids: [expenseId] } as const;
      }

      await transaction.$executeRawUnsafe(
        `UPDATE running_balance
         SET status = 2, date_updated = NOW()
         WHERE id = ? AND status = 1 AND aj = 1`,
        expenseId,
      );
      await transaction.$executeRawUnsafe(
        `INSERT INTO approvement
           (balance_id, user_id, \`date\`, approved, remarks, pix, pix_type)
         VALUES (?, ?, NOW(), 1, ?, ?, ?)`,
        expenseId,
        approverId,
        remarks || 'Aprovado',
        row.pix,
        integerOrNull(row.pix_type),
      );

      return { kind: 'approved', items: [this.item(row)] } as const;
    });
  }

  approveBatch(
    approverId: number,
    entries: Array<{ id: number; remarks: string }>,
  ): Promise<ExpenseApprovalMutationResult> {
    const ordered = [...entries].sort((left, right) => left.id - right.id);
    const ids = ordered.map((entry) => entry.id);
    const remarksById = new Map(ordered.map((entry) => [entry.id, entry.remarks]));

    return this.database.$transaction(async (transaction) => {
      const placeholders = ids.map(() => '?').join(',');
      const rows = await transaction.$queryRawUnsafe<ApprovalRow[]>(
        `${APPROVAL_SELECT}
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

      const notPending = rows
        .filter((row) => numberValue(row.status) !== 1)
        .map((row) => numberValue(row.id));
      if (notPending.length > 0) {
        return { kind: 'not-pending', ids: notPending } as const;
      }

      await transaction.$executeRawUnsafe(
        `UPDATE running_balance
         SET status = 2, date_updated = NOW()
         WHERE id IN (${placeholders}) AND status = 1 AND aj = 1`,
        ...ids,
      );

      for (const row of rows) {
        const id = numberValue(row.id);
        await transaction.$executeRawUnsafe(
          `INSERT INTO approvement
             (balance_id, user_id, \`date\`, approved, remarks, pix, pix_type)
           VALUES (?, ?, NOW(), 1, ?, ?, ?)`,
          id,
          approverId,
          remarksById.get(id) || 'Aprovado',
          row.pix,
          integerOrNull(row.pix_type),
        );
      }

      return {
        kind: 'approved',
        items: rows.map((row) => this.item(row)),
      } as const;
    });
  }

  reject(expenseId: number): Promise<ExpenseApprovalMutationResult> {
    return this.database.$transaction(async (transaction) => {
      const rows = await transaction.$queryRawUnsafe<ApprovalRow[]>(
        `${APPROVAL_SELECT}
         WHERE r.id = ?
           AND r.aj = 1
         LIMIT 1
         FOR UPDATE`,
        expenseId,
      );
      const row = rows[0];
      if (!row) return { kind: 'not-found', ids: [expenseId] } as const;
      if (numberValue(row.status) !== 1) {
        return { kind: 'not-pending', ids: [expenseId] } as const;
      }

      await transaction.$executeRawUnsafe(
        `UPDATE running_balance
         SET status = 3, date_updated = NOW()
         WHERE id = ? AND status = 1 AND aj = 1`,
        expenseId,
      );

      return { kind: 'rejected', ids: [expenseId] } as const;
    });
  }

  private item(row: ApprovalRow): LogisticsExpenseApprovalItem {
    const attachments = parseAttachments(row.anexos);
    const categoryId = numberValue(row.category_id);

    return {
      id: numberValue(row.id),
      createdAt: row.date_created,
      categoryId,
      categoryName: row.category_name ?? `Categoria #${categoryId}`,
      clientName: row.cliente?.trim() || 'Sem cliente',
      userId: numberValue(row.user_id),
      userName: row.user_name ?? `Usuário #${row.user_id}`,
      amount: numberValue(row.amount),
      remarks: row.remarks ?? '',
      pix: row.pix ?? '',
      pixTypeId: integerOrNull(row.pix_type),
      pixTypeName: row.pix_type_name ?? '',
      attachments: this.attachments(attachments),
      receiptRequiredMissing: categoryId === 43 && attachments.length === 0,
    };
  }


  private attachment(
    attachments: AttachmentJson[],
    key: string,
  ): AttachmentJson | undefined {
    if (key.startsWith('legacy-')) {
      const index = Number(key.slice('legacy-'.length));
      if (
        Number.isSafeInteger(index) &&
        index >= 0 &&
        index < attachments.length &&
        !attachments[index]?.id
      ) {
        return attachments[index];
      }
      return undefined;
    }

    return attachments.find((attachment) => attachment.id === key);
  }

  private uploadRoot(): string {
    return path.resolve(
      process.env.RD_UPLOAD_DIR?.trim() || path.join(process.cwd(), 'uploads_rd'),
    );
  }

  private safeStoragePath(relative: string): string | null {
    const root = this.uploadRoot();
    const candidate = path.resolve(root, relative);
    return candidate !== root && candidate.startsWith(`${root}${path.sep}`)
      ? candidate
      : null;
  }

  private physicalPath(attachment: AttachmentJson): string | null {
    if (attachment.storagePath) {
      return this.safeStoragePath(attachment.storagePath);
    }
    if (!attachment.url) return null;

    try {
      const pathname = new URL(attachment.url, 'http://legacy.local').pathname;
      const marker = '/uploads_rd/';
      const index = pathname.toLowerCase().indexOf(marker);
      if (index < 0) return null;
      const relative = decodeURIComponent(pathname.slice(index + marker.length));
      return this.safeStoragePath(relative);
    } catch {
      return null;
    }
  }

  private attachments(
    attachments: AttachmentJson[],
  ): LogisticsExpenseApprovalAttachment[] {
    return attachments.map((attachment, index) => ({
      key: attachment.id ?? `legacy-${index}`,
      name:
        attachment.nome ??
        attachment.fileName ??
        `Comprovante ${index + 1}`,
      native: Boolean(attachment.id && attachment.storagePath),
    }));
  }
}

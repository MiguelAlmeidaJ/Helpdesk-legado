import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import type {
  CreateLogisticsExpenseRequest,
  LogisticsExpenseAttachment,
  LogisticsExpenseItem,
  LogisticsExpenseManagementResponse,
  LogisticsExpenseOption,
  LogisticsExpenseStatus,
  UpdateLogisticsExpenseRequest,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

interface ProfileRow {
  user_id: number;
  user_nome: string | null;
  pix_type: number | string | null;
  pix: string | null;
}

interface OptionRow {
  id: number;
  name: string | null;
}

interface ExpenseRow {
  id: number;
  remarks: string | null;
  clt_id: number | null;
  cliente_nome: string | null;
  amount: number | string | null;
  category_id: number;
  category_name: string | null;
  date_created: string;
  status: number;
  pix: string | null;
  pix_type: number | string | null;
  anexos: string | null;
}

interface MutableExpenseRow {
  id: number;
  user_id: number;
  status: number;
  anexos: string | null;
}

interface AttachmentJson {
  id?: string;
  nome?: string;
  fileName?: string;
  url?: string;
  storagePath?: string;
  mimeType?: string;
}

interface AttachmentContent {
  name: string;
  mimeType: string;
  data: Buffer;
}

interface InsertIdRow {
  id: number | bigint;
}

function numberValue(value: number | string | null): number {
  if (value === null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function integerOrNull(value: number | string | null): number | null {
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

function cleanRemarks(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  return trimmed
    .replace(/^<p[^>]*>/i, '')
    .replace(/<\/p>$/i, '')
    .trim();
}

@Injectable()
export class ExpenseManagementRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async get(
    userId: number,
    startDate: string,
    endDate: string,
  ): Promise<LogisticsExpenseManagementResponse | null> {
    const [profiles, categories, clients, pixTypes, expenses] =
      await Promise.all([
        this.database.$queryRawUnsafe<ProfileRow[]>(
          `SELECT
             user_id,
             user_nome,
             pix_type,
             chavepix AS pix
           FROM usuarios
           WHERE user_id = ?
           LIMIT 1`,
          userId,
        ),
        this.database.$queryRaw<OptionRow[]>`
          SELECT id, nome AS name
          FROM categorias_subgrupo
          WHERE aplicavel IN ('Ambos', 'RD')
          ORDER BY nome
        `,
        this.database.$queryRaw<OptionRow[]>`
          SELECT clt_id AS id, clt_nomef AS name
          FROM clientes
          ORDER BY clt_nomef
        `,
        this.database.$queryRaw<OptionRow[]>`
          SELECT id, name_type AS name
          FROM type_keys
          ORDER BY id
        `,
        this.database.$queryRawUnsafe<ExpenseRow[]>(
          `SELECT
             r.id,
             r.remarks,
             r.clt_id,
             r.cliente AS cliente_nome,
             r.amount,
             r.category_id,
             c.nome AS category_name,
             DATE_FORMAT(r.date_created, '%Y-%m-%dT%H:%i:%s') AS date_created,
             r.status,
             r.pix,
             r.pix_type,
             r.anexos
           FROM running_balance r
           LEFT JOIN categorias_subgrupo c ON c.id = r.category_id
           WHERE r.user_id = ?
             AND r.date_created BETWEEN ? AND ?
             AND r.aj = 1
           ORDER BY r.date_created DESC`,
          userId,
          `${startDate} 00:00:00`,
          `${endDate} 23:59:59`,
        ),
      ]);

    const profile = profiles[0];
    if (!profile) return null;

    return {
      period: {
        startDate,
        endDate,
      },
      profile: {
        userId: profile.user_id,
        userName: profile.user_nome ?? `Usuário #${profile.user_id}`,
        pixTypeId: integerOrNull(profile.pix_type),
        pix: profile.pix ?? '',
      },
      categories: this.options(categories),
      clients: this.options(clients),
      pixTypes: this.options(pixTypes),
      expenses: expenses.map((row) => this.item(row)),
    };
  }

  async create(
    userId: number,
    request: CreateLogisticsExpenseRequest,
  ): Promise<number | null> {
    const catalog = await this.catalogValues(
      request.categoryId,
      request.clientId,
      request.pixTypeId,
      userId,
    );
    if (!catalog) return null;

    return this.database.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(
        `INSERT INTO running_balance (
           remarks,
           clt_id,
           cliente,
           amount,
           user_id,
           category_id,
           pix_type,
           pix,
           anexos,
           status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
        cleanRemarks(request.remarks),
        request.clientId,
        catalog.clientName,
        request.amount,
        userId,
        request.categoryId,
        request.pixTypeId,
        request.pix?.trim() || catalog.defaultPix,
      );

      const ids = await transaction.$queryRawUnsafe<InsertIdRow[]>(
        'SELECT LAST_INSERT_ID() AS id',
      );
      const id = Number(ids[0]?.id);
      return Number.isSafeInteger(id) && id > 0 ? id : null;
    });
  }

  async update(
    userId: number,
    id: number,
    request: UpdateLogisticsExpenseRequest,
  ): Promise<'updated' | 'not-found' | 'locked' | 'invalid-catalog'> {
    const catalog = await this.catalogValues(
      request.categoryId,
      request.clientId,
      request.pixTypeId,
      userId,
    );
    if (!catalog) return 'invalid-catalog';

    return this.database.$transaction(async (transaction) => {
      const rows = await transaction.$queryRawUnsafe<MutableExpenseRow[]>(
        `SELECT id, user_id, status, anexos
         FROM running_balance
         WHERE id = ? AND user_id = ?
         LIMIT 1
         FOR UPDATE`,
        id,
        userId,
      );
      const row = rows[0];
      if (!row) return 'not-found';
      if (Number(row.status) !== 1) return 'locked';

      await transaction.$executeRawUnsafe(
        `UPDATE running_balance
         SET amount = ?,
             category_id = ?,
             pix_type = ?,
             pix = ?,
             clt_id = ?,
             cliente = ?,
             remarks = ?,
             date_updated = NOW()
         WHERE id = ? AND user_id = ? AND status = 1`,
        request.amount,
        request.categoryId,
        request.pixTypeId,
        request.pix?.trim() || catalog.defaultPix,
        request.clientId,
        catalog.clientName,
        cleanRemarks(request.remarks),
        id,
        userId,
      );
      return 'updated';
    });
  }

  async delete(
    userId: number,
    id: number,
  ): Promise<'deleted' | 'not-found' | 'locked'> {
    let attachments: AttachmentJson[] = [];

    const result = await this.database.$transaction(async (transaction) => {
      const rows = await transaction.$queryRawUnsafe<MutableExpenseRow[]>(
        `SELECT id, user_id, status, anexos
         FROM running_balance
         WHERE id = ? AND user_id = ?
         LIMIT 1
         FOR UPDATE`,
        id,
        userId,
      );
      const row = rows[0];
      if (!row) return 'not-found' as const;
      if (Number(row.status) !== 1) return 'locked' as const;

      attachments = parseAttachments(row.anexos);
      await transaction.$executeRawUnsafe(
        `DELETE FROM running_balance
         WHERE id = ? AND user_id = ? AND status = 1`,
        id,
        userId,
      );
      return 'deleted' as const;
    });

    if (result === 'deleted') {
      await Promise.all(
        attachments.map((attachment) => this.removePhysical(attachment)),
      );
    }
    return result;
  }

  async uploadAttachment(input: {
    userId: number;
    userName: string;
    expenseId: number;
    originalName: string;
    mimeType: string;
    data: Buffer;
  }): Promise<LogisticsExpenseAttachment | 'not-found' | 'locked'> {
    const attachmentId = randomUUID();
    const originalName = this.safeOriginalName(input.originalName);
    const date = new Date();
    const directory = path.join(
      'native',
      `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}`,
    );
    const storedName = `${attachmentId}.pdf`;
    const relativePath = path.posix.join(
      directory.replace(/\\/g, '/'),
      storedName,
    );
    const physical = this.safeStoragePath(relativePath);
    if (!physical) {
      throw new Error('Caminho de armazenamento de RD inválido.');
    }

    await mkdir(path.dirname(physical), { recursive: true });
    await writeFile(physical, input.data);

    const publicUrl = `${this.webOrigin()}/logistics/expenses/attachments/${input.expenseId}/${attachmentId}`;
    const stored: AttachmentJson = {
      id: attachmentId,
      nome: originalName,
      url: publicUrl,
      storagePath: relativePath,
      mimeType: input.mimeType || 'application/pdf',
    };

    try {
      const result = await this.database.$transaction(async (transaction) => {
        const rows = await transaction.$queryRawUnsafe<MutableExpenseRow[]>(
          `SELECT id, user_id, status, anexos
           FROM running_balance
           WHERE id = ? AND user_id = ?
           LIMIT 1
           FOR UPDATE`,
          input.expenseId,
          input.userId,
        );
        const row = rows[0];
        if (!row) return 'not-found' as const;
        if (Number(row.status) !== 1) return 'locked' as const;

        const attachments = parseAttachments(row.anexos);
        attachments.push(stored);

        await transaction.$executeRawUnsafe(
          `UPDATE running_balance
           SET anexos = ?, date_updated = NOW()
           WHERE id = ? AND user_id = ? AND status = 1`,
          JSON.stringify(attachments),
          input.expenseId,
          input.userId,
        );

        return 'uploaded' as const;
      });

      if (result !== 'uploaded') {
        await unlink(physical).catch(() => undefined);
        return result;
      }

      return {
        key: attachmentId,
        name: originalName,
        contentUrl: publicUrl,
        native: true,
      };
    } catch (error) {
      await unlink(physical).catch(() => undefined);
      throw error;
    }
  }

  async deleteAttachment(
    userId: number,
    expenseId: number,
    attachmentKey: string,
  ): Promise<'deleted' | 'not-found' | 'locked'> {
    let removed: AttachmentJson | undefined;

    const result = await this.database.$transaction(async (transaction) => {
      const rows = await transaction.$queryRawUnsafe<MutableExpenseRow[]>(
        `SELECT id, user_id, status, anexos
         FROM running_balance
         WHERE id = ? AND user_id = ?
         LIMIT 1
         FOR UPDATE`,
        expenseId,
        userId,
      );
      const row = rows[0];
      if (!row) return 'not-found' as const;
      if (Number(row.status) !== 1) return 'locked' as const;

      const attachments = parseAttachments(row.anexos);
      const index = this.attachmentIndex(attachments, attachmentKey);
      if (index < 0) return 'not-found' as const;

      removed = attachments[index];
      attachments.splice(index, 1);

      await transaction.$executeRawUnsafe(
        `UPDATE running_balance
         SET anexos = ?, date_updated = NOW()
         WHERE id = ? AND user_id = ? AND status = 1`,
        attachments.length > 0 ? JSON.stringify(attachments) : null,
        expenseId,
        userId,
      );
      return 'deleted' as const;
    });

    if (result === 'deleted' && removed) {
      await this.removePhysical(removed);
    }
    return result;
  }

  async attachmentContent(
    userId: number,
    expenseId: number,
    attachmentKey: string,
  ): Promise<AttachmentContent | null> {
    const rows = await this.database.$queryRawUnsafe<{ anexos: string | null }[]>(
      `SELECT anexos
       FROM running_balance
       WHERE id = ? AND user_id = ? AND aj = 1
       LIMIT 1`,
      expenseId,
      userId,
    );
    const attachments = parseAttachments(rows[0]?.anexos ?? null);
    const index = this.attachmentIndex(attachments, attachmentKey);
    if (index < 0) return null;

    const attachment = attachments[index];
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

  private item(row: ExpenseRow): LogisticsExpenseItem {
    const attachments = parseAttachments(row.anexos);

    return {
      id: Number(row.id),
      remarks: row.remarks ?? '',
      clientId: row.clt_id,
      clientName: row.cliente_nome ?? 'Não informado',
      amount: numberValue(row.amount),
      categoryId: Number(row.category_id),
      categoryName: row.category_name ?? 'Não informada',
      createdAt: row.date_created,
      status: this.status(row.status),
      pixTypeId: integerOrNull(row.pix_type),
      pix: row.pix ?? '',
      attachments: attachments.map((attachment, index) => {
        const key = attachment.id ?? `legacy-${index}`;
        return {
          key,
          name:
            attachment.nome ??
            attachment.fileName ??
            `Comprovante ${index + 1}`,
          contentUrl: `/logistics/expenses/attachments/${row.id}/${encodeURIComponent(key)}`,
          native: Boolean(attachment.id && attachment.storagePath),
        };
      }),
      canEdit: Number(row.status) === 1,
    };
  }

  private options(rows: OptionRow[]): LogisticsExpenseOption[] {
    return rows.map((row) => ({
      id: Number(row.id),
      name: row.name?.trim() || `#${row.id}`,
    }));
  }

  private status(value: number): LogisticsExpenseStatus {
    return value === 2 || value === 3 || value === 4 ? value : 1;
  }

  private async catalogValues(
    categoryId: number,
    clientId: number,
    pixTypeId: number,
    userId: number,
  ): Promise<{ clientName: string; defaultPix: string } | null> {
    const [categories, clients, pixTypes, users] = await Promise.all([
      this.database.$queryRawUnsafe<{ id: number }[]>(
        `SELECT id
         FROM categorias_subgrupo
         WHERE id = ? AND aplicavel IN ('Ambos', 'RD')
         LIMIT 1`,
        categoryId,
      ),
      this.database.$queryRawUnsafe<{ name: string | null }[]>(
        'SELECT clt_nomef AS name FROM clientes WHERE clt_id = ? LIMIT 1',
        clientId,
      ),
      this.database.$queryRawUnsafe<{ id: number }[]>(
        'SELECT id FROM type_keys WHERE id = ? LIMIT 1',
        pixTypeId,
      ),
      this.database.$queryRawUnsafe<{ pix: string | null }[]>(
        'SELECT chavepix AS pix FROM usuarios WHERE user_id = ? LIMIT 1',
        userId,
      ),
    ]);

    const client = clients[0];
    if (!categories[0] || !client || !pixTypes[0] || !users[0]) {
      return null;
    }

    return {
      clientName: client.name?.trim() || `Cliente #${clientId}`,
      defaultPix: users[0].pix?.trim() ?? '',
    };
  }

  private attachmentIndex(
    attachments: AttachmentJson[],
    key: string,
  ): number {
    if (key.startsWith('legacy-')) {
      const index = Number(key.slice('legacy-'.length));
      return Number.isSafeInteger(index) &&
        index >= 0 &&
        index < attachments.length &&
        !attachments[index]?.id
        ? index
        : -1;
    }

    return attachments.findIndex((attachment) => attachment.id === key);
  }

  private uploadRoot(): string {
    return path.resolve(
      process.env.RD_UPLOAD_DIR?.trim() ||
        path.join(process.cwd(), 'uploads_rd'),
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

      const relative = decodeURIComponent(
        pathname.slice(index + marker.length),
      );
      return this.safeStoragePath(relative);
    } catch {
      return null;
    }
  }

  private async removePhysical(attachment: AttachmentJson): Promise<void> {
    const physical = this.physicalPath(attachment);
    if (physical) {
      await unlink(physical).catch(() => undefined);
    }
  }

  private safeOriginalName(value: string): string {
    const name = path.basename(value.replace(/\\/g, '/')).trim();
    return (name || 'comprovante.pdf').slice(0, 255);
  }

  private webOrigin(): string {
    return (
      process.env.WEB_PUBLIC_URL?.trim() ||
      process.env.WEB_ORIGIN?.trim() ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
  }
}

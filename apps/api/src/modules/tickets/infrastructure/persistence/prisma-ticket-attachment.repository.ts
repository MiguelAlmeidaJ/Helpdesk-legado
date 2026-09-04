import { Inject, Injectable } from '@nestjs/common';
import type {
  TicketAttachment,
  TicketAttachmentKind,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import {
  mkdir,
  readFile,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketAttachmentRepository,
  type AddTicketAttachmentInput,
  type DeleteTicketAttachmentInput,
  type TicketAttachmentAccessInput,
  type TicketAttachmentContent,
} from '../../application/ports/ticket-attachment.repository';

interface VisibilityRow { tipo_usuario: number; }
interface ClientScopeRow { cliente_id: number; }
interface TicketRow { id: number; }
interface AttachmentRow {
  id: number;
  kind: TicketAttachmentKind;
  name: string;
  mime_type: string | null;
  uploaded_at: Date | string | null;
  user_id: number | null;
  user_name: string | null;
}
interface DocumentRow {
  id: number;
  caminho_arquivo: string;
  nome_arquivo: string;
  tipo_arquivo: string | null;
}
interface ImageRow {
  id: number;
  img_atd: Uint8Array | Buffer | null;
}
interface InsertIdRow { id: number | bigint; }

function iso(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

@Injectable()
export class PrismaTicketAttachmentRepository
  extends TicketAttachmentRepository
{
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async list(
    input: TicketAttachmentAccessInput,
  ): Promise<TicketAttachment[] | null> {
    if (!(await this.visibleTicket(input))) {
      return null;
    }

    const rows = await this.database.$queryRawUnsafe<AttachmentRow[]>(
      `(
         SELECT
           d.id,
           'document' AS kind,
           d.nome_arquivo AS name,
           d.tipo_arquivo AS mime_type,
           d.data_upload AS uploaded_at,
           d.user_id,
           u.user_nome AS user_name
         FROM documentos d
         LEFT JOIN usuarios u ON u.user_id = d.user_id
         WHERE d.atd_id = ?
       )
       UNION ALL
       (
         SELECT
           i.id,
           'image' AS kind,
           CONCAT('Imagem #', i.id) AS name,
           'image/jpeg' AS mime_type,
           i.data_atualizacao AS uploaded_at,
           i.user_id,
           u.user_nome AS user_name
         FROM imagens i
         LEFT JOIN usuarios u ON u.user_id = i.user_id
         WHERE i.atd_id = ?
       )
       ORDER BY uploaded_at DESC, id DESC`,
      input.ticketId,
      input.ticketId,
    );

    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      name: row.name,
      mimeType: row.mime_type ?? 'application/octet-stream',
      uploadedAt: iso(row.uploaded_at),
      uploadedBy: {
        id: row.user_id,
        name: row.user_name,
      },
    }));
  }

  async content(
    input: DeleteTicketAttachmentInput,
  ): Promise<TicketAttachmentContent | null> {
    if (!(await this.visibleTicket(input))) {
      return null;
    }

    if (input.kind === 'image') {
      const rows = await this.database.$queryRawUnsafe<ImageRow[]>(
        `SELECT id, img_atd
         FROM imagens
         WHERE id = ? AND atd_id = ?
         LIMIT 1`,
        input.attachmentId,
        input.ticketId,
      );
      const row = rows[0];
      if (!row?.img_atd) return null;
      return {
        name: `Imagem #${row.id}.jpg`,
        mimeType: 'image/jpeg',
        data: Buffer.from(row.img_atd),
      };
    }

    const rows = await this.database.$queryRawUnsafe<DocumentRow[]>(
      `SELECT id, caminho_arquivo, nome_arquivo, tipo_arquivo
       FROM documentos
       WHERE id = ? AND atd_id = ?
       LIMIT 1`,
      input.attachmentId,
      input.ticketId,
    );
    const row = rows[0];
    if (!row) return null;

    const physical = this.physicalPath(row.caminho_arquivo);
    if (!physical) return null;

    try {
      return {
        name: row.nome_arquivo,
        mimeType: row.tipo_arquivo ?? 'application/octet-stream',
        data: await readFile(physical),
      };
    } catch {
      return null;
    }
  }

  async add(
    input: AddTicketAttachmentInput,
  ): Promise<TicketAttachment | null> {
    if (!(await this.visibleTicket(input))) {
      return null;
    }

    const originalName = this.safeOriginalName(input.originalName);
    const extension = path.extname(originalName).replace(/[^.a-zA-Z0-9]/g, '');
    const date = new Date();
    const prefix = `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}`;
    const storedName = `${prefix}_${randomUUID()}${extension || '.bin'}`;
    const uploadRoot = this.uploadRoot();
    await mkdir(uploadRoot, { recursive: true });
    const physical = path.join(uploadRoot, storedName);
    await writeFile(physical, input.data);

    try {
      return await this.database.$transaction(async (transaction) => {
        if (!(await this.lockVisibleTicket(transaction, input))) {
          return null;
        }

        await transaction.$executeRawUnsafe(
          `INSERT INTO documentos (
             atd_id, user_id, caminho_arquivo, nome_arquivo,
             tipo_arquivo, data_upload
           ) VALUES (?, ?, ?, ?, ?, NOW())`,
          input.ticketId,
          input.actorUserId,
          `../uploads/${storedName}`,
          originalName,
          input.mimeType || 'application/octet-stream',
        );
        const ids = await transaction.$queryRawUnsafe<InsertIdRow[]>(
          'SELECT LAST_INSERT_ID() AS id',
        );
        const id = Number(ids[0]?.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
          throw new Error('Falha ao identificar anexo criado.');
        }

        await transaction.$executeRawUnsafe(
          `INSERT INTO interatividade (
             inter_tipo, inter_atd, inter_user, inter_data, inter_desc
           ) VALUES (12, ?, ?, NOW(), ?)`,
          input.ticketId,
          input.actorUserId,
          `Adicionou um anexo: ${originalName}`,
        );

        return {
          id,
          kind: 'document' as const,
          name: originalName,
          mimeType: input.mimeType || 'application/octet-stream',
          uploadedAt: new Date().toISOString(),
          uploadedBy: {
            id: input.actorUserId,
            name: null,
          },
        };
      });
    } catch (error) {
      await unlink(physical).catch(() => undefined);
      throw error;
    }
  }

  async delete(input: DeleteTicketAttachmentInput): Promise<boolean> {
    if (!(await this.visibleTicket(input))) {
      return false;
    }

    let storedPath: string | null = null;

    const deleted = await this.database.$transaction(async (transaction) => {
      if (!(await this.lockVisibleTicket(transaction, input))) {
        return false;
      }

      if (input.kind === 'image') {
        const rows = await transaction.$queryRawUnsafe<{ id: number }[]>(
          `SELECT id FROM imagens
           WHERE id = ? AND atd_id = ?
           LIMIT 1 FOR UPDATE`,
          input.attachmentId,
          input.ticketId,
        );
        if (!rows[0]) return false;

        await transaction.$executeRawUnsafe(
          'DELETE FROM imagens WHERE id = ? AND atd_id = ?',
          input.attachmentId,
          input.ticketId,
        );
        await this.logDelete(
          transaction,
          input,
          `Deletou uma imagem: Imagem #${input.attachmentId}`,
        );
        return true;
      }

      const rows = await transaction.$queryRawUnsafe<DocumentRow[]>(
        `SELECT id, caminho_arquivo, nome_arquivo, tipo_arquivo
         FROM documentos
         WHERE id = ? AND atd_id = ?
         LIMIT 1 FOR UPDATE`,
        input.attachmentId,
        input.ticketId,
      );
      const row = rows[0];
      if (!row) return false;
      storedPath = row.caminho_arquivo;

      await transaction.$executeRawUnsafe(
        'DELETE FROM documentos WHERE id = ? AND atd_id = ?',
        input.attachmentId,
        input.ticketId,
      );
      await this.logDelete(
        transaction,
        input,
        `Excluiu o anexo: ${row.nome_arquivo}`,
      );
      return true;
    });

    if (deleted && storedPath) {
      const physical = this.physicalPath(storedPath);
      if (physical) {
        await unlink(physical).catch(() => undefined);
      }
    }
    return deleted;
  }

  private async logDelete(
    transaction: Pick<Nivel3DatabaseClient, '$executeRawUnsafe'>,
    input: DeleteTicketAttachmentInput,
    description: string,
  ) {
    await transaction.$executeRawUnsafe(
      `INSERT INTO interatividade (
         inter_tipo, inter_atd, inter_user, inter_data, inter_desc
       ) VALUES (11, ?, ?, NOW(), ?)`,
      input.ticketId,
      input.actorUserId,
      description,
    );
  }

  private uploadRoot() {
    return path.resolve(
      process.env.TICKET_UPLOAD_DIR?.trim() || path.join(process.cwd(), 'uploads'),
    );
  }

  private physicalPath(storedPath: string): string | null {
    const normalized = storedPath.replace(/\\/g, '/').replace(/^(\.\.\/)+/, '');
    const relative = normalized.startsWith('uploads/')
      ? normalized.slice('uploads/'.length)
      : normalized;
    const root = this.uploadRoot();
    const candidate = path.resolve(root, relative);
    if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
      return null;
    }
    return candidate;
  }

  private safeOriginalName(name: string) {
    const normalized = path.basename(name.replace(/\\/g, '/')).trim();
    return normalized.slice(0, 255) || 'arquivo.bin';
  }

  private async visibleTicket(input: TicketAttachmentAccessInput) {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) return false;

    const where = ['a.id = ?'];
    const params: unknown[] = [input.ticketId];
    if (clientIds !== null) {
      where.push(`a.cliente IN (${clientIds.map(() => '?').join(', ')})`);
      params.push(...clientIds);
    }
    if (input.ownerTechnicianId !== undefined) {
      where.push('a.tecnico = ?');
      params.push(input.ownerTechnicianId);
    }
    if (input.actorUserId === 134) {
      where.push(
        '(LOWER(a.desc_abertura) LIKE LOWER(?) OR LOWER(a.desc_fechamento) LIKE LOWER(?))',
      );
      params.push('%NET DO BRASIL%', '%NET DO BRASIL%');
    }

    const rows = await this.database.$queryRawUnsafe<TicketRow[]>(
      `SELECT a.id FROM atendimentos a
       WHERE ${where.join(' AND ')}
       LIMIT 1`,
      ...params,
    );
    return Boolean(rows[0]);
  }

  private async lockVisibleTicket(
    transaction: Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>,
    input: TicketAttachmentAccessInput,
  ) {
    const where = ['a.id = ?'];
    const params: unknown[] = [input.ticketId];
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null) {
      if (clientIds.length === 0) return false;
      where.push(`a.cliente IN (${clientIds.map(() => '?').join(', ')})`);
      params.push(...clientIds);
    }
    if (input.ownerTechnicianId !== undefined) {
      where.push('a.tecnico = ?');
      params.push(input.ownerTechnicianId);
    }
    if (input.actorUserId === 134) {
      where.push(
        '(LOWER(a.desc_abertura) LIKE LOWER(?) OR LOWER(a.desc_fechamento) LIKE LOWER(?))',
      );
      params.push('%NET DO BRASIL%', '%NET DO BRASIL%');
    }
    const rows = await transaction.$queryRawUnsafe<TicketRow[]>(
      `SELECT a.id FROM atendimentos a
       WHERE ${where.join(' AND ')}
       LIMIT 1 FOR UPDATE`,
      ...params,
    );
    return Boolean(rows[0]);
  }

  private async resolveRestrictedClientIds(userId: number) {
    const users = await this.database.$queryRawUnsafe<VisibilityRow[]>(
      'SELECT tipo_usuario FROM usuarios WHERE user_id = ? LIMIT 1',
      userId,
    );
    if (users[0]?.tipo_usuario !== 2) return null;
    const clients = await this.database.$queryRawUnsafe<ClientScopeRow[]>(
      'SELECT cliente_id FROM clientes_usuarios WHERE usuario_id = ?',
      userId,
    );
    return clients.map((client) => client.cliente_id);
  }
}

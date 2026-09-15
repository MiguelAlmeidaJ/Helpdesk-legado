import { Inject, Injectable } from '@nestjs/common';
import type { TicketProjectTaskImage } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketProjectTaskImageRepository,
  type TicketProjectTaskImageAccessInput,
  type TicketProjectTaskImageContent,
  type TicketProjectTaskImageIdentityInput,
  type TicketProjectTaskImageReplaceInput,
  type TicketProjectTaskImageWriteInput,
} from '../../application/ports/ticket-project-task-image.repository';

interface VisibilityRow {
  tipo_usuario: number;
}

interface ClientScopeRow {
  cliente_id: number;
}

interface TaskRow {
  id: number;
}

interface ImageMetadataRow {
  id: number;
  data_atualizacao: Date | string | null;
  user_id: number | null;
  user_name: string | null;
}

interface ImageContentRow {
  id: number;
  img_tarefa: Uint8Array | Buffer | null;
}

interface InsertIdRow {
  id: number | bigint | string;
}

type QueryClient = Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>;
function iso(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

@Injectable()
export class PrismaTicketProjectTaskImageRepository
  extends TicketProjectTaskImageRepository
{
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async list(
    input: TicketProjectTaskImageAccessInput,
  ): Promise<TicketProjectTaskImage[] | null> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (!(await this.visibleTask(this.database, input, clientIds))) {
      return null;
    }

    const rows = await this.database.$queryRawUnsafe<ImageMetadataRow[]>(
      `SELECT
         i.id,
         i.data_atualizacao,
         i.user_id,
         u.user_nome AS user_name
       FROM imagens_tarefa i
       LEFT JOIN usuarios u ON u.user_id = i.user_id
       WHERE i.tarefa_id = ?
       ORDER BY i.data_atualizacao DESC, i.id DESC`,
      input.taskId,
    );

    return rows.map((row) => this.mapMetadata(input.taskId, row));
  }

  async content(
    input: TicketProjectTaskImageIdentityInput,
  ): Promise<TicketProjectTaskImageContent | null> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (!(await this.visibleTask(this.database, input, clientIds))) {
      return null;
    }

    const rows = await this.database.$queryRawUnsafe<ImageContentRow[]>(
      `SELECT id, img_tarefa
       FROM imagens_tarefa
       WHERE id = ?
         AND tarefa_id = ?
       LIMIT 1`,
      input.imageId,
      input.taskId,
    );
    const row = rows[0];

    if (!row?.img_tarefa) {
      return null;
    }

    return {
      name: this.imageName(input.taskId, row.id),
      mimeType: 'image/jpeg',
      data: Buffer.from(row.img_tarefa),
    };
  }

  async add(
    input: TicketProjectTaskImageWriteInput,
  ): Promise<TicketProjectTaskImage | null> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return null;
    }

    return this.database.$transaction(async (transaction) => {
      if (!(await this.visibleTask(transaction, input, clientIds, true))) {
        return null;
      }

      await transaction.$executeRawUnsafe(
        `INSERT INTO imagens_tarefa (
           tarefa_id,
           user_id,
           img_tarefa,
           data_atualizacao
         )
         VALUES (?, ?, ?, NOW())`,
        input.taskId,
        input.actorUserId,
        input.data,
      );

      const ids = await transaction.$queryRawUnsafe<InsertIdRow[]>(
        'SELECT LAST_INSERT_ID() AS id',
      );
      const imageId = Number(ids[0]?.id);

      if (!Number.isSafeInteger(imageId) || imageId <= 0) {
        throw new Error('Não foi possível identificar a imagem criada.');
      }

      return this.metadata(transaction, input.taskId, imageId);
    });
  }

  async replace(
    input: TicketProjectTaskImageReplaceInput,
  ): Promise<TicketProjectTaskImage | null> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return null;
    }

    return this.database.$transaction(async (transaction) => {
      if (!(await this.visibleTask(transaction, input, clientIds, true))) {
        return null;
      }

      if (!(await this.lockImage(transaction, input.taskId, input.imageId))) {
        return null;
      }

      await transaction.$executeRawUnsafe(
        `UPDATE imagens_tarefa
         SET img_tarefa = ?,
             user_id = ?,
             data_atualizacao = NOW()
         WHERE id = ?
           AND tarefa_id = ?`,
        input.data,
        input.actorUserId,
        input.imageId,
        input.taskId,
      );

      return this.metadata(transaction, input.taskId, input.imageId);
    });
  }

  async delete(
    input: TicketProjectTaskImageIdentityInput,
  ): Promise<boolean> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return false;
    }

    return this.database.$transaction(async (transaction) => {
      if (!(await this.visibleTask(transaction, input, clientIds, true))) {
        return false;
      }

      if (!(await this.lockImage(transaction, input.taskId, input.imageId))) {
        return false;
      }

      await transaction.$executeRawUnsafe(
        `DELETE FROM imagens_tarefa
         WHERE id = ?
           AND tarefa_id = ?`,
        input.imageId,
        input.taskId,
      );

      return true;
    });
  }

  private async metadata(
    client: QueryClient,
    taskId: number,
    imageId: number,
  ): Promise<TicketProjectTaskImage | null> {
    const rows = await client.$queryRawUnsafe<ImageMetadataRow[]>(
      `SELECT
         i.id,
         i.data_atualizacao,
         i.user_id,
         u.user_nome AS user_name
       FROM imagens_tarefa i
       LEFT JOIN usuarios u ON u.user_id = i.user_id
       WHERE i.id = ?
         AND i.tarefa_id = ?
       LIMIT 1`,
      imageId,
      taskId,
    );

    return rows[0] ? this.mapMetadata(taskId, rows[0]) : null;
  }

  private mapMetadata(
    taskId: number,
    row: ImageMetadataRow,
  ): TicketProjectTaskImage {
    return {
      id: row.id,
      name: this.imageName(taskId, row.id),
      mimeType: 'image/jpeg',
      updatedAt: iso(row.data_atualizacao),
      uploadedBy: {
        id: row.user_id,
        name: row.user_name,
      },
    };
  }

  private imageName(taskId: number, imageId: number): string {
    return `tarefa-${taskId}-imagem-${imageId}.jpg`;
  }

  private async lockImage(
    transaction: QueryClient,
    taskId: number,
    imageId: number,
  ): Promise<boolean> {
    const rows = await transaction.$queryRawUnsafe<Array<{ id: number }>>(
      `SELECT id
       FROM imagens_tarefa
       WHERE id = ?
         AND tarefa_id = ?
       LIMIT 1
       FOR UPDATE`,
      imageId,
      taskId,
    );

    return Boolean(rows[0]);
  }

  private async visibleTask(
    client: QueryClient,
    input: TicketProjectTaskImageAccessInput,
    clientIds: number[] | null,
    lock = false,
  ): Promise<boolean> {
    if (clientIds !== null && clientIds.length === 0) {
      return false;
    }

    const where = ['t.id = ?'];
    const params: unknown[] = [input.taskId];

    if (clientIds !== null) {
      where.push(`t.cliente IN (${clientIds.map(() => '?').join(', ')})`);
      params.push(...clientIds);
    }

    if (input.ownerTechnicianId !== undefined) {
      where.push('t.tecnico = ?');
      params.push(input.ownerTechnicianId);
    }

    if (input.actorUserId === 134) {
      where.push(
        '(LOWER(t.nome_tarefa) LIKE LOWER(?) OR LOWER(t.desc_abertura) LIKE LOWER(?) OR LOWER(t.desc_fechamento) LIKE LOWER(?) OR LOWER(c.clt_nomef) LIKE LOWER(?))',
      );
      params.push(
        '%NET DO BRASIL%',
        '%NET DO BRASIL%',
        '%NET DO BRASIL%',
        '%NET DO BRASIL%',
      );
    }

    const rows = await client.$queryRawUnsafe<TaskRow[]>(
      `SELECT t.id
       FROM tarefas t
       INNER JOIN clientes c ON c.clt_id = t.cliente
       WHERE ${where.join(' AND ')}
       LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
      ...params,
    );

    return Boolean(rows[0]);
  }

  private async resolveRestrictedClientIds(
    userId: number,
  ): Promise<number[] | null> {
    const users = await this.database.$queryRawUnsafe<VisibilityRow[]>(
      `SELECT tipo_usuario
       FROM usuarios
       WHERE user_id = ?
       LIMIT 1`,
      userId,
    );

    if (users[0]?.tipo_usuario !== 2) {
      return null;
    }

    const clients = await this.database.$queryRawUnsafe<ClientScopeRow[]>(
      `SELECT cliente_id
       FROM clientes_usuarios
       WHERE usuario_id = ?`,
      userId,
    );

    return clients.map((row) => row.cliente_id);
  }
}

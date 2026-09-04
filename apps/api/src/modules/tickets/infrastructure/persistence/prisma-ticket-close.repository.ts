import { Inject, Injectable } from '@nestjs/common';
import { TicketStatus } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketCloseRepository,
  type ConcludeTicketPersistenceInput,
  type FinalizeTicketPersistenceInput,
  type TicketClosePersistenceResult,
} from '../../application/ports/ticket-close.repository';
import { enqueueTicketNotification } from '../outbox/enqueue-ticket-notification';

interface VisibilityRow { tipo_usuario: number; }
interface ClientScopeRow { cliente_id: number; }
interface TicketRow { id: number; status: number | null; }
interface ActiveCompletionRow { concluido_id: number; }

@Injectable()
export class PrismaTicketCloseRepository extends TicketCloseRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async conclude(
    input: ConcludeTicketPersistenceInput,
  ): Promise<TicketClosePersistenceResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) return 'not-found';

    return this.database.$transaction(async (transaction) => {
      const ticket = await this.lockVisibleTicket(
        transaction,
        input.ticketId,
        input.actorUserId,
        input.ownerTechnicianId,
        clientIds,
      );
      if (!ticket) return 'not-found';
      if (ticket.status !== TicketStatus.InProgress) return 'invalid-state';

      const active = await transaction.$queryRawUnsafe<ActiveCompletionRow[]>(
        `SELECT concluido_id
         FROM concluido
         WHERE concluido_atd = ?
           AND concluido_end IS NULL
         ORDER BY concluido_id DESC
         LIMIT 1
         FOR UPDATE`,
        input.ticketId,
      );
      if (active[0]) return 'active-completion';

      await transaction.$executeRawUnsafe(
        'UPDATE atendimentos SET status = ? WHERE id = ?',
        TicketStatus.Completed,
        input.ticketId,
      );
      await transaction.$executeRawUnsafe(
        `INSERT INTO concluido (
           concluido_atd, concluido_start, concluido_prev,
           concluido_desc, concluido_user
         ) VALUES (?, NOW(), NULL, ?, ?)`,
        input.ticketId,
        input.description,
        input.actorUserId,
      );
      await transaction.$executeRawUnsafe(
        `INSERT INTO interatividade (
           inter_tipo, inter_atd, inter_user, inter_data, inter_desc
         ) VALUES (10, ?, ?, NOW(), ?)`,
        input.ticketId,
        input.actorUserId,
        `Colocou o atendimento como concluído.\nDescrição: ${input.description}`,
      );
      await enqueueTicketNotification(
        transaction,
        'ticket.concluded',
        input.ticketId,
        {
          actorUserId: input.actorUserId,
          description: input.description,
        },
      );
      return 'updated';
    });
  }

  async finalize(
    input: FinalizeTicketPersistenceInput,
  ): Promise<TicketClosePersistenceResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) return 'not-found';

    return this.database.$transaction(async (transaction) => {
      const ticket = await this.lockVisibleTicket(
        transaction,
        input.ticketId,
        input.actorUserId,
        input.ownerTechnicianId,
        clientIds,
      );
      if (!ticket) return 'not-found';
      if (
        ticket.status === null ||
        !input.allowedStatuses.includes(ticket.status as TicketStatus)
      ) {
        return 'invalid-state';
      }

      if (ticket.status === TicketStatus.OnHold) {
        await transaction.$executeRawUnsafe(
          `UPDATE espera SET espera_end = NOW()
           WHERE espera_atd = ? AND espera_end IS NULL`,
          input.ticketId,
        );
      }

      if (ticket.status === TicketStatus.Completed) {
        await transaction.$executeRawUnsafe(
          `UPDATE concluido SET concluido_end = NOW()
           WHERE concluido_atd = ? AND concluido_end IS NULL`,
          input.ticketId,
        );
      }

      await transaction.$executeRawUnsafe(
        `UPDATE atendimentos
         SET desc_fechamento = ?, fechamento = NOW(), status = ?
         WHERE id = ?`,
        input.description,
        TicketStatus.Finished,
        input.ticketId,
      );
      await transaction.$executeRawUnsafe(
        `INSERT INTO interatividade (
           inter_tipo, inter_atd, inter_user, inter_data, inter_desc
         ) VALUES (8, ?, ?, NOW(), ?)`,
        input.ticketId,
        input.actorUserId,
        `Finalizou o atendimento.\nDescrição: ${input.description}`,
      );
      await enqueueTicketNotification(
        transaction,
        'ticket.finalized',
        input.ticketId,
        {
          actorUserId: input.actorUserId,
          description: input.description,
        },
      );
      return 'updated';
    });
  }

  private async resolveRestrictedClientIds(
    userId: number,
  ): Promise<number[] | null> {
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

  private async lockVisibleTicket(
    transaction: Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>,
    ticketId: number,
    actorUserId: number,
    ownerTechnicianId: number | undefined,
    clientIds: number[] | null,
  ): Promise<TicketRow | null> {
    const where = ['a.id = ?'];
    const params: unknown[] = [ticketId];

    if (clientIds !== null) {
      where.push(`a.cliente IN (${clientIds.map(() => '?').join(', ')})`);
      params.push(...clientIds);
    }
    if (ownerTechnicianId !== undefined) {
      where.push('a.tecnico = ?');
      params.push(ownerTechnicianId);
    }
    if (actorUserId === 134) {
      where.push(
        '(LOWER(a.desc_abertura) LIKE LOWER(?) OR LOWER(a.desc_fechamento) LIKE LOWER(?))',
      );
      params.push('%NET DO BRASIL%', '%NET DO BRASIL%');
    }

    const rows = await transaction.$queryRawUnsafe<TicketRow[]>(
      `SELECT a.id, a.status
       FROM atendimentos a
       WHERE ${where.join(' AND ')}
       LIMIT 1
       FOR UPDATE`,
      ...params,
    );
    return rows[0] ?? null;
  }
}

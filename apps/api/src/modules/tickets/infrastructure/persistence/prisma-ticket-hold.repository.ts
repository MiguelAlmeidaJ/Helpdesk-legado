import { Inject, Injectable } from '@nestjs/common';
import { TicketStatus } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketHoldRepository,
  type PutTicketOnHoldPersistenceInput,
  type PutTicketOnHoldPersistenceResult,
  type ResumeTicketPersistenceInput,
  type ResumeTicketPersistenceResult,
} from '../../application/ports/ticket-hold.repository';
import { enqueueTicketNotification } from '../outbox/enqueue-ticket-notification';

interface VisibilityRow {
  tipo_usuario: number;
}

interface ClientScopeRow {
  cliente_id: number;
}

interface TicketRow {
  id: number;
  status: number | null;
}

interface ActiveHoldRow {
  espera_id: number;
}

@Injectable()
export class PrismaTicketHoldRepository extends TicketHoldRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async putOnHold(
    input: PutTicketOnHoldPersistenceInput,
  ): Promise<PutTicketOnHoldPersistenceResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);

    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const ticket = await this.lockVisibleTicket(
        transaction,
        input.ticketId,
        input.actorUserId,
        input.ownerTechnicianId,
        clientIds,
      );

      if (!ticket) {
        return 'not-found';
      }

      if (
        ticket.status !== TicketStatus.WaitingExecution &&
        ticket.status !== TicketStatus.InProgress
      ) {
        return 'invalid-state';
      }

      const activeHold = await this.lockActiveHold(
        transaction,
        input.ticketId,
      );

      if (activeHold) {
        return 'already-on-hold';
      }

      await transaction.$executeRawUnsafe(
        `INSERT INTO espera (
           espera_atd,
           espera_user,
           espera_prev,
           espera_causa,
           espera_desc,
           id_melhorias,
           espera_start
         )
         VALUES (?, ?, ?, ?, ?, NULL, NOW())`,
        input.ticketId,
        input.actorUserId,
        input.forecastAt,
        input.cause,
        input.description,
      );

      await transaction.$executeRawUnsafe(
        `UPDATE atendimentos
         SET status = ?
         WHERE id = ?`,
        TicketStatus.OnHold,
        input.ticketId,
      );

      await transaction.$executeRawUnsafe(
        `INSERT INTO interatividade (
           inter_tipo,
           inter_atd,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (5, ?, ?, NOW(), ?)`,
        input.ticketId,
        input.actorUserId,
        [
          'Colocou o atendimento em espera.',
          `Previsão de retorno: ${input.forecastAt.toISOString()}`,
          `Causa: ${input.cause}`,
          `Descrição: ${input.description}`,
        ].join('\n'),
      );

      await enqueueTicketNotification(
        transaction,
        'ticket.on_hold',
        input.ticketId,
        {
          actorUserId: input.actorUserId,
          cause: input.cause,
          description: input.description,
          forecastAt: input.forecastAt.toISOString(),
        },
      );

      return 'updated';
    });
  }

  async resume(
    input: ResumeTicketPersistenceInput,
  ): Promise<ResumeTicketPersistenceResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);

    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const ticket = await this.lockVisibleTicket(
        transaction,
        input.ticketId,
        input.actorUserId,
        input.ownerTechnicianId,
        clientIds,
      );

      if (!ticket) {
        return 'not-found';
      }

      if (ticket.status !== TicketStatus.OnHold) {
        return 'invalid-state';
      }

      const activeHold = await this.lockActiveHold(
        transaction,
        input.ticketId,
      );

      if (!activeHold) {
        return 'missing-active-hold';
      }

      await transaction.$executeRawUnsafe(
        `UPDATE atendimentos
         SET status = ?
         WHERE id = ?`,
        TicketStatus.InProgress,
        input.ticketId,
      );

      await transaction.$executeRawUnsafe(
        `UPDATE espera
         SET espera_end = NOW()
         WHERE espera_atd = ?
           AND espera_end IS NULL`,
        input.ticketId,
      );

      await transaction.$executeRawUnsafe(
        `INSERT INTO interatividade (
           inter_tipo,
           inter_atd,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (6, ?, ?, NOW(), ?)`,
        input.ticketId,
        input.actorUserId,
        'Retomou o atendimento.',
      );

      await enqueueTicketNotification(
        transaction,
        'ticket.resumed',
        input.ticketId,
        { actorUserId: input.actorUserId },
      );

      return 'updated';
    });
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

  private async lockActiveHold(
    transaction: Pick<Nivel3DatabaseClient, '$queryRawUnsafe'>,
    ticketId: number,
  ): Promise<ActiveHoldRow | null> {
    const rows = await transaction.$queryRawUnsafe<ActiveHoldRow[]>(
      `SELECT espera_id
       FROM espera
       WHERE espera_atd = ?
         AND espera_end IS NULL
       ORDER BY espera_id DESC
       LIMIT 1
       FOR UPDATE`,
      ticketId,
    );

    return rows[0] ?? null;
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { TicketStatus } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketRejectionRepository,
  type RejectTicketPersistenceInput,
  type RejectTicketPersistenceResult,
} from '../../application/ports/ticket-rejection.repository';

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

interface TechnicianRow {
  id: number;
  name: string;
}

@Injectable()
export class PrismaTicketRejectionRepository
  extends TicketRejectionRepository
{
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async reject(
    input: RejectTicketPersistenceInput,
  ): Promise<RejectTicketPersistenceResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);

    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
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

      const tickets = await transaction.$queryRawUnsafe<TicketRow[]>(
        `SELECT a.id, a.status
         FROM atendimentos a
         WHERE ${where.join(' AND ')}
         LIMIT 1
         FOR UPDATE`,
        ...params,
      );

      const ticket = tickets[0];

      if (!ticket) {
        return 'not-found';
      }

      if (ticket.status !== TicketStatus.InProgress) {
        return 'invalid-state';
      }

      let technicianName: string | null = null;

      if (input.technicianId > 0) {
        const technicians =
          await transaction.$queryRawUnsafe<TechnicianRow[]>(
            `SELECT user_id AS id, user_nome AS name
             FROM usuarios
             WHERE user_id = ?
               AND user_sts = '1'
             LIMIT 1`,
            input.technicianId,
          );

        technicianName = technicians[0]?.name ?? null;

        if (!technicianName) {
          return 'invalid-technician';
        }
      }

      await transaction.$executeRawUnsafe(
        `UPDATE atendimentos
         SET tecnico = ?, status = ?
         WHERE id = ?`,
        input.technicianId,
        TicketStatus.WaitingExecution,
        input.ticketId,
      );

      const interactionType = input.technicianId === 0 ? 3 : 4;
      const interactionDescription =
        input.technicianId === 0
          ? `Recusou o atendimento:\n${input.reason}`
          : `Direcionou o atendimento para ${technicianName}:\n${input.reason}`;

      await transaction.$executeRawUnsafe(
        `INSERT INTO interatividade (
           inter_tipo,
           inter_atd,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (?, ?, ?, NOW(), ?)`,
        interactionType,
        input.ticketId,
        input.actorUserId,
        interactionDescription,
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
}

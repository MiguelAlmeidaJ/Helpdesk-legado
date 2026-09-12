import { Inject, Injectable } from '@nestjs/common';
import {
  TicketStatus,
  type TicketAssignmentOption,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketAssignmentRepository,
  type UpdateTicketAssignmentPersistenceInput,
  type UpdateTicketAssignmentPersistenceResult,
} from '../../application/ports/ticket-assignment.repository';

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
export class PrismaTicketAssignmentRepository
  extends TicketAssignmentRepository
{
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async listTechnicians(
    onlyUserId?: number,
  ): Promise<TicketAssignmentOption[]> {
    const where = ["user_sts = '1'"];
    const params: unknown[] = [];

    if (onlyUserId !== undefined) {
      where.push('user_id = ?');
      params.push(onlyUserId);
    }

    const rows = await this.database.$queryRawUnsafe<TechnicianRow[]>(
      `SELECT user_id AS id, user_nome AS name
       FROM usuarios
       WHERE ${where.join(' AND ')}
       ORDER BY user_nome ASC`,
      ...params,
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
    }));
  }

  async updateAssignment(
    input: UpdateTicketAssignmentPersistenceInput,
  ): Promise<UpdateTicketAssignmentPersistenceResult> {
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

      if (ticket.status !== TicketStatus.WaitingExecution) {
        return 'invalid-state';
      }

      const technicians = await transaction.$queryRawUnsafe<TechnicianRow[]>(
        `SELECT user_id AS id, user_nome AS name
         FROM usuarios
         WHERE user_id = ?
           AND user_sts = '1'
         LIMIT 1`,
        input.technicianId,
      );
      const technician = technicians[0];

      if (!technician) {
        return 'invalid-technician';
      }

      const acceptingForSelf = input.technicianId === input.actorUserId;
      const nextStatus = acceptingForSelf
        ? TicketStatus.InProgress
        : TicketStatus.WaitingExecution;
      const interactionType = acceptingForSelf ? 2 : 4;
      const interactionDescription = acceptingForSelf
        ? 'Iniciou o atendimento.'
        : `Direcionou o atendimento para ${technician.name}.`;

      await transaction.$executeRawUnsafe(
        `UPDATE atendimentos
         SET tecnico = ?, status = ?
         WHERE id = ?`,
        input.technicianId,
        nextStatus,
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

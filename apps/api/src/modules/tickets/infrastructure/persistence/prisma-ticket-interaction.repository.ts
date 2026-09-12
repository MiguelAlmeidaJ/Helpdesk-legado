import { Inject, Injectable } from '@nestjs/common';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketInteractionRepository,
  type CreateTicketInteractionPersistenceInput,
} from '../../application/ports/ticket-interaction.repository';

interface VisibilityRow {
  tipo_usuario: number;
}

interface ClientScopeRow {
  cliente_id: number;
}

interface TicketExistsRow {
  id: number;
}

@Injectable()
export class PrismaTicketInteractionRepository
  extends TicketInteractionRepository
{
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async create(
    input: CreateTicketInteractionPersistenceInput,
  ): Promise<boolean> {
    const clientIds = await this.resolveRestrictedClientIds(input.userId);

    if (clientIds !== null && clientIds.length === 0) {
      return false;
    }

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

    if (input.userId === 134) {
      where.push(
        '(LOWER(a.desc_abertura) LIKE LOWER(?) OR LOWER(a.desc_fechamento) LIKE LOWER(?))',
      );
      params.push('%NET DO BRASIL%', '%NET DO BRASIL%');
    }

    const tickets = await this.database.$queryRawUnsafe<TicketExistsRow[]>(
      `SELECT a.id
       FROM atendimentos a
       WHERE ${where.join(' AND ')}
       LIMIT 1`,
      ...params,
    );

    if (!tickets[0]) {
      return false;
    }

    const affected = await this.database.$executeRawUnsafe(
      `INSERT INTO interatividade (
         inter_tipo,
         inter_atd,
         inter_user,
         inter_data,
         inter_desc
       )
       VALUES (7, ?, ?, NOW(), ?)`,
      input.ticketId,
      input.userId,
      input.description,
    );

    return affected === 1;
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

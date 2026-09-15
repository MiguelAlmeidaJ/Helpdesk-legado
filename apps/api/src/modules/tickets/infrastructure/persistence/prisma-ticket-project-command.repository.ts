import { Inject, Injectable } from '@nestjs/common';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketProjectCommandRepository,
  type TicketProjectAssignmentPersistenceInput,
  type TicketProjectAssignmentResult,
  type TicketProjectCommandResult,
  type TicketProjectCommandScope,
  type TicketProjectFinalizePersistenceInput,
  type TicketProjectHoldPersistenceInput,
  type TicketProjectHoldResult,
  type TicketProjectInteractionPersistenceInput,
  type TicketProjectRejectionPersistenceInput,
  type TicketProjectRejectionResult,
  type TicketProjectResumeResult,
} from '../../application/ports/ticket-project-command.repository';

interface VisibilityRow {
  tipo_usuario: number;
}

interface ClientScopeRow {
  cliente_id: number;
}

interface ProjectRow {
  id: number;
  status: number | null;
  tecnico: number | null;
}

interface TechnicianRow {
  id: number;
  name: string;
}

interface ActiveHoldRow {
  espera_id: number;
}

type TransactionClient = Pick<
  Nivel3DatabaseClient,
  '$queryRawUnsafe' | '$executeRawUnsafe'
>;

@Injectable()
export class PrismaTicketProjectCommandRepository
  extends TicketProjectCommandRepository
{
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async addInteraction(
    input: TicketProjectInteractionPersistenceInput,
  ): Promise<TicketProjectCommandResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const project = await this.lockVisibleProject(
        transaction,
        input,
        clientIds,
      );
      if (!project) {
        return 'not-found';
      }

      await transaction.$executeRawUnsafe(
        `INSERT INTO inter_projeto (
           inter_tipo,
           inter_projeto,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (7, ?, ?, NOW(), ?)`,
        input.projectId,
        input.actorUserId,
        input.description,
      );

      return 'updated';
    });
  }

  async assign(
    input: TicketProjectAssignmentPersistenceInput,
  ): Promise<TicketProjectAssignmentResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const project = await this.lockVisibleProject(
        transaction,
        input,
        clientIds,
      );
      if (!project) {
        return 'not-found';
      }

      if (project.status !== 1) {
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
      const nextStatus = acceptingForSelf ? 2 : 1;
      const interactionType = acceptingForSelf ? 2 : 4;
      const interactionDescription = acceptingForSelf
        ? 'Iniciou o projeto.'
        : `Direcionou o projeto para ${technician.name}.`;

      await transaction.$executeRawUnsafe(
        `UPDATE projetos
         SET tecnico = ?, status = ?
         WHERE id = ?`,
        input.technicianId,
        nextStatus,
        input.projectId,
      );

      await transaction.$executeRawUnsafe(
        `INSERT INTO inter_projeto (
           inter_tipo,
           inter_projeto,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (?, ?, ?, NOW(), ?)`,
        interactionType,
        input.projectId,
        input.actorUserId,
        interactionDescription,
      );

      return 'updated';
    });
  }

  async putOnHold(
    input: TicketProjectHoldPersistenceInput,
  ): Promise<TicketProjectHoldResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const project = await this.lockVisibleProject(
        transaction,
        input,
        clientIds,
      );
      if (!project) {
        return 'not-found';
      }

      if (project.status !== 2) {
        return 'invalid-state';
      }

      const activeHold = await this.lockActiveHold(transaction, input.projectId);
      if (activeHold) {
        return 'already-on-hold';
      }

      await transaction.$executeRawUnsafe(
        `INSERT INTO espera_projeto (
           espera_projeto,
           espera_start,
           espera_prev,
           espera_desc,
           espera_user
         )
         VALUES (?, NOW(), ?, ?, ?)`,
        input.projectId,
        input.forecastAt,
        input.description,
        input.actorUserId,
      );

      await transaction.$executeRawUnsafe(
        `UPDATE projetos
         SET status = 3
         WHERE id = ?`,
        input.projectId,
      );

      await transaction.$executeRawUnsafe(
        `INSERT INTO inter_projeto (
           inter_tipo,
           inter_projeto,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (5, ?, ?, NOW(), ?)`,
        input.projectId,
        input.actorUserId,
        [
          'Colocou o projeto em espera.',
          `Previsão de retorno: ${input.forecastAt}`,
          `Descrição: ${input.description}`,
        ].join('\n'),
      );

      return 'updated';
    });
  }

  async resume(
    input: TicketProjectCommandScope,
  ): Promise<TicketProjectResumeResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const project = await this.lockVisibleProject(
        transaction,
        input,
        clientIds,
      );
      if (!project) {
        return 'not-found';
      }

      if (project.status !== 3) {
        return 'invalid-state';
      }

      const activeHold = await this.lockActiveHold(transaction, input.projectId);
      if (!activeHold) {
        return 'missing-active-hold';
      }

      await transaction.$executeRawUnsafe(
        `UPDATE projetos
         SET status = 2
         WHERE id = ?`,
        input.projectId,
      );

      await transaction.$executeRawUnsafe(
        `UPDATE espera_projeto
         SET espera_end = NOW()
         WHERE espera_projeto = ?
           AND espera_end IS NULL`,
        input.projectId,
      );

      await transaction.$executeRawUnsafe(
        `INSERT INTO inter_projeto (
           inter_tipo,
           inter_projeto,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (6, ?, ?, NOW(), ?)`,
        input.projectId,
        input.actorUserId,
        'Retomou o projeto.',
      );

      return 'updated';
    });
  }

  async reject(
    input: TicketProjectRejectionPersistenceInput,
  ): Promise<TicketProjectRejectionResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const project = await this.lockVisibleProject(
        transaction,
        input,
        clientIds,
      );
      if (!project) {
        return 'not-found';
      }

      if (project.status !== 2) {
        return 'invalid-state';
      }

      let technicianName: string | null = null;

      if (input.technicianId > 0) {
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

        technicianName = technician.name;
      }

      await transaction.$executeRawUnsafe(
        `UPDATE projetos
         SET tecnico = ?, status = 1
         WHERE id = ?`,
        input.technicianId,
        input.projectId,
      );

      const interactionType = input.technicianId > 0 ? 4 : 3;
      const interactionDescription =
        input.technicianId > 0
          ? `Direcionou o projeto para ${technicianName}.\n${input.reason}`
          : `Recusou o projeto.\n${input.reason}`;

      await transaction.$executeRawUnsafe(
        `INSERT INTO inter_projeto (
           inter_tipo,
           inter_projeto,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (?, ?, ?, NOW(), ?)`,
        interactionType,
        input.projectId,
        input.actorUserId,
        interactionDescription,
      );

      return 'updated';
    });
  }

  async finalize(
    input: TicketProjectFinalizePersistenceInput,
  ): Promise<TicketProjectCommandResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const project = await this.lockVisibleProject(
        transaction,
        input,
        clientIds,
      );
      if (!project) {
        return 'not-found';
      }

      if (
        project.status === null ||
        !input.allowedStatuses.includes(project.status)
      ) {
        return 'invalid-state';
      }

      if (project.status === 3) {
        await transaction.$executeRawUnsafe(
          `UPDATE espera_projeto
           SET espera_end = NOW()
           WHERE espera_projeto = ?
             AND espera_end IS NULL`,
          input.projectId,
        );
      }

      await transaction.$executeRawUnsafe(
        `UPDATE projetos
         SET desc_fechamento = ?,
             fechamento = NOW(),
             status = 4
         WHERE id = ?`,
        input.description,
        input.projectId,
      );

      await transaction.$executeRawUnsafe(
        `INSERT INTO inter_projeto (
           inter_tipo,
           inter_projeto,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (8, ?, ?, NOW(), ?)`,
        input.projectId,
        input.actorUserId,
        `Finalizou o projeto.\nDescrição: ${input.description}`,
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

  private async lockVisibleProject(
    transaction: TransactionClient,
    input: TicketProjectCommandScope,
    clientIds: number[] | null,
  ): Promise<ProjectRow | null> {
    const where = ['p.id = ?'];
    const params: unknown[] = [input.projectId];

    if (clientIds !== null) {
      where.push(`p.cliente IN (${clientIds.map(() => '?').join(', ')})`);
      params.push(...clientIds);
    }

    if (input.ownerTechnicianId !== undefined) {
      where.push('p.tecnico = ?');
      params.push(input.ownerTechnicianId);
    }

    const rows = await transaction.$queryRawUnsafe<ProjectRow[]>(
      `SELECT p.id, p.status, p.tecnico
       FROM projetos p
       WHERE ${where.join(' AND ')}
       LIMIT 1
       FOR UPDATE`,
      ...params,
    );

    return rows[0] ?? null;
  }

  private async lockActiveHold(
    transaction: TransactionClient,
    projectId: number,
  ): Promise<ActiveHoldRow | null> {
    const rows = await transaction.$queryRawUnsafe<ActiveHoldRow[]>(
      `SELECT espera_id
       FROM espera_projeto
       WHERE espera_projeto = ?
         AND espera_end IS NULL
       ORDER BY espera_id DESC
       LIMIT 1
       FOR UPDATE`,
      projectId,
    );

    return rows[0] ?? null;
  }
}

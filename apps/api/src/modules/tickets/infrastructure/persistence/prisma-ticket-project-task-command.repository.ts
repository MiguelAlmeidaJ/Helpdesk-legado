import { Inject, Injectable } from '@nestjs/common';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketProjectTaskCommandRepository,
  type TicketProjectTaskAssignmentPersistenceInput,
  type TicketProjectTaskAssignmentResult,
  type TicketProjectTaskCommandResult,
  type TicketProjectTaskCommandScope,
  type TicketProjectTaskFinalizePersistenceInput,
  type TicketProjectTaskHoldPersistenceInput,
  type TicketProjectTaskHoldResult,
  type TicketProjectTaskInteractionPersistenceInput,
  type TicketProjectTaskProgressPersistenceInput,
  type TicketProjectTaskRejectionPersistenceInput,
  type TicketProjectTaskRejectionResult,
  type TicketProjectTaskResumeResult,
} from '../../application/ports/ticket-project-task-command.repository';

interface VisibilityRow {
  tipo_usuario: number;
}

interface ClientScopeRow {
  cliente_id: number;
}

interface ProjectTaskRow {
  id: number;
  status: number | null;
  tecnico: number | null;
  id_projeto: number | null;
  tarefas_relacionadas: number | null;
}

interface TechnicianRow {
  id: number;
  name: string;
}

interface ActiveHoldRow {
  espera_id: number;
}

interface ProjectRow {
  id: number;
  status: number | null;
}

interface CountRow {
  total: bigint | number | string;
}

type TransactionClient = Pick<
  Nivel3DatabaseClient,
  '$queryRawUnsafe' | '$executeRawUnsafe'
>;

@Injectable()
export class PrismaTicketProjectTaskCommandRepository
  extends TicketProjectTaskCommandRepository
{
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async addInteraction(
    input: TicketProjectTaskInteractionPersistenceInput,
  ): Promise<TicketProjectTaskCommandResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const task = await this.lockVisibleTask(transaction, input, clientIds);
      if (!task) {
        return 'not-found';
      }

      await transaction.$executeRawUnsafe(
        `INSERT INTO inter_tarefa (
           inter_tipo,
           inter_tarefa,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (7, ?, ?, NOW(), ?)`,
        input.taskId,
        input.actorUserId,
        input.description,
      );

      return 'updated';
    });
  }

  async assign(
    input: TicketProjectTaskAssignmentPersistenceInput,
  ): Promise<TicketProjectTaskAssignmentResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const task = await this.lockVisibleTask(transaction, input, clientIds);
      if (!task) {
        return 'not-found';
      }

      if (task.status !== 1) {
        return 'invalid-state';
      }

      if (
        task.tarefas_relacionadas !== null &&
        task.tarefas_relacionadas > 0
      ) {
        const dependency = await transaction.$queryRawUnsafe<
          Array<{ status: number | null }>
        >(
          `SELECT status
           FROM tarefas
           WHERE id = ?
           LIMIT 1`,
          task.tarefas_relacionadas,
        );

        if (dependency[0]?.status !== 4) {
          return 'blocked-by-dependency';
        }
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
        ? 'Iniciou a tarefa.'
        : `Direcionou a tarefa para ${technician.name}.`;

      await transaction.$executeRawUnsafe(
        `UPDATE tarefas
         SET tecnico = ?, status = ?
         WHERE id = ?`,
        input.technicianId,
        nextStatus,
        input.taskId,
      );

      await transaction.$executeRawUnsafe(
        `INSERT INTO inter_tarefa (
           inter_tipo,
           inter_tarefa,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (?, ?, ?, NOW(), ?)`,
        interactionType,
        input.taskId,
        input.actorUserId,
        interactionDescription,
      );

      return 'updated';
    });
  }

  async putOnHold(
    input: TicketProjectTaskHoldPersistenceInput,
  ): Promise<TicketProjectTaskHoldResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const task = await this.lockVisibleTask(transaction, input, clientIds);
      if (!task) {
        return 'not-found';
      }

      if (task.status !== 2) {
        return 'invalid-state';
      }

      const activeHold = await this.lockActiveHold(transaction, input.taskId);
      if (activeHold) {
        return 'already-on-hold';
      }

      await transaction.$executeRawUnsafe(
        `INSERT INTO espera_tarefas (
           espera_tarefa,
           espera_start,
           espera_prev,
           espera_desc,
           espera_user
         )
         VALUES (?, NOW(), ?, ?, ?)`,
        input.taskId,
        input.forecastAt,
        input.description,
        input.actorUserId,
      );

      await transaction.$executeRawUnsafe(
        `UPDATE tarefas
         SET status = 3
         WHERE id = ?`,
        input.taskId,
      );

      await transaction.$executeRawUnsafe(
        `INSERT INTO inter_tarefa (
           inter_tipo,
           inter_tarefa,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (5, ?, ?, NOW(), ?)`,
        input.taskId,
        input.actorUserId,
        [
          'Colocou a tarefa em espera.',
          `Previsão de retorno: ${input.forecastAt}`,
          `Descrição: ${input.description}`,
        ].join('\n'),
      );

      return 'updated';
    });
  }

  async resume(
    input: TicketProjectTaskCommandScope,
  ): Promise<TicketProjectTaskResumeResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const task = await this.lockVisibleTask(transaction, input, clientIds);
      if (!task) {
        return 'not-found';
      }

      if (task.status !== 3) {
        return 'invalid-state';
      }

      const activeHold = await this.lockActiveHold(transaction, input.taskId);
      if (!activeHold) {
        return 'missing-active-hold';
      }

      await transaction.$executeRawUnsafe(
        `UPDATE tarefas
         SET status = 2
         WHERE id = ?`,
        input.taskId,
      );

      await transaction.$executeRawUnsafe(
        `UPDATE espera_tarefas
         SET espera_end = NOW()
         WHERE espera_tarefa = ?
           AND espera_end IS NULL`,
        input.taskId,
      );

      await transaction.$executeRawUnsafe(
        `INSERT INTO inter_tarefa (
           inter_tipo,
           inter_tarefa,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (6, ?, ?, NOW(), ?)`,
        input.taskId,
        input.actorUserId,
        'Retomou a tarefa.',
      );

      return 'updated';
    });
  }

  async reject(
    input: TicketProjectTaskRejectionPersistenceInput,
  ): Promise<TicketProjectTaskRejectionResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const task = await this.lockVisibleTask(transaction, input, clientIds);
      if (!task) {
        return 'not-found';
      }

      if (task.status !== 2) {
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
        `UPDATE tarefas
         SET tecnico = ?, status = 1
         WHERE id = ?`,
        input.technicianId,
        input.taskId,
      );

      const interactionType = input.technicianId > 0 ? 4 : 3;
      const interactionDescription =
        input.technicianId > 0
          ? `Direcionou a tarefa para ${technicianName}.\n${input.reason}`
          : `Recusou a tarefa.\n${input.reason}`;

      await transaction.$executeRawUnsafe(
        `INSERT INTO inter_tarefa (
           inter_tipo,
           inter_tarefa,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (?, ?, ?, NOW(), ?)`,
        interactionType,
        input.taskId,
        input.actorUserId,
        interactionDescription,
      );

      return 'updated';
    });
  }

  async finalize(
    input: TicketProjectTaskFinalizePersistenceInput,
  ): Promise<TicketProjectTaskCommandResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const task = await this.lockVisibleTask(transaction, input, clientIds);
      if (!task) {
        return 'not-found';
      }

      if (
        task.status === null ||
        !input.allowedStatuses.includes(task.status)
      ) {
        return 'invalid-state';
      }

      if (task.status === 3) {
        await transaction.$executeRawUnsafe(
          `UPDATE espera_tarefas
           SET espera_end = NOW()
           WHERE espera_tarefa = ?
             AND espera_end IS NULL`,
          input.taskId,
        );
      }

      await transaction.$executeRawUnsafe(
        `UPDATE tarefas
         SET desc_fechamento = ?,
             fechamento = NOW(),
             porcentagem = 100,
             status = 4
         WHERE id = ?`,
        input.description,
        input.taskId,
      );

      await transaction.$executeRawUnsafe(
        `INSERT INTO inter_tarefa (
           inter_tipo,
           inter_tarefa,
           inter_user,
           inter_data,
           inter_desc
         )
         VALUES (8, ?, ?, NOW(), ?)`,
        input.taskId,
        input.actorUserId,
        `Finalizou a tarefa.\nDescrição: ${input.description}`,
      );

      if (task.id_projeto !== null && task.id_projeto > 0) {
        await this.finishProjectIfComplete(
          transaction,
          task.id_projeto,
          input.actorUserId,
        );
      }

      return 'updated';
    });
  }

  async updateProgress(
    input: TicketProjectTaskProgressPersistenceInput,
  ): Promise<TicketProjectTaskCommandResult> {
    const clientIds = await this.resolveRestrictedClientIds(input.actorUserId);
    if (clientIds !== null && clientIds.length === 0) {
      return 'not-found';
    }

    return this.database.$transaction(async (transaction) => {
      const task = await this.lockVisibleTask(transaction, input, clientIds);
      if (!task) {
        return 'not-found';
      }

      if (task.status === 4) {
        return 'invalid-state';
      }

      await transaction.$executeRawUnsafe(
        `UPDATE tarefas
         SET porcentagem = ?
         WHERE id = ?`,
        input.progress,
        input.taskId,
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

  private async lockVisibleTask(
    transaction: TransactionClient,
    input: TicketProjectTaskCommandScope,
    clientIds: number[] | null,
  ): Promise<ProjectTaskRow | null> {
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

    const rows = await transaction.$queryRawUnsafe<ProjectTaskRow[]>(
      `SELECT
         t.id,
         t.status,
         t.tecnico,
         t.id_projeto,
         t.tarefas_relacionadas
       FROM tarefas t
       INNER JOIN clientes c ON c.clt_id = t.cliente
       WHERE ${where.join(' AND ')}
       LIMIT 1
       FOR UPDATE`,
      ...params,
    );

    return rows[0] ?? null;
  }

  private async lockActiveHold(
    transaction: TransactionClient,
    taskId: number,
  ): Promise<ActiveHoldRow | null> {
    const rows = await transaction.$queryRawUnsafe<ActiveHoldRow[]>(
      `SELECT espera_id
       FROM espera_tarefas
       WHERE espera_tarefa = ?
         AND espera_end IS NULL
       ORDER BY espera_id DESC
       LIMIT 1
       FOR UPDATE`,
      taskId,
    );

    return rows[0] ?? null;
  }

  private async finishProjectIfComplete(
    transaction: TransactionClient,
    projectId: number,
    actorUserId: number,
  ): Promise<void> {
    const projects = await transaction.$queryRawUnsafe<ProjectRow[]>(
      `SELECT id, status
       FROM projetos
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      projectId,
    );
    const project = projects[0];

    if (!project || project.status === 4) {
      return;
    }

    const openTasks = await transaction.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM tarefas
       WHERE id_projeto = ?
         AND (status IS NULL OR status <> 4)`,
      projectId,
    );

    if (Number(openTasks[0]?.total ?? 0) !== 0) {
      return;
    }

    const description = 'Todas as tarefas finalizadas';

    await transaction.$executeRawUnsafe(
      `UPDATE projetos
       SET desc_fechamento = ?,
           fechamento = NOW(),
           status = 4
       WHERE id = ?`,
      description,
      projectId,
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
      projectId,
      actorUserId,
      `Finalizou o projeto.\nDescrição: ${description}`,
    );
  }
}

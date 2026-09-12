import { Inject, Injectable } from '@nestjs/common';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import {
  TicketProjectScheduleActivationRepository,
  type TicketProjectScheduleActivationInput,
} from '../../application/ports/ticket-project-schedule-activation.repository';

interface IdRow {
  id: number;
}

type TransactionClient = Pick<
  Nivel3DatabaseClient,
  '$queryRawUnsafe' | '$executeRawUnsafe'
>;

const TASK_ACTIVATION_DESCRIPTION =
  'Status do atendimento alterado automaticamente para Aguardando Execução.';
const PROJECT_ACTIVATION_DESCRIPTION =
  'Status do projeto alterado automaticamente para Aguardando Execução.';

@Injectable()
export class PrismaTicketProjectScheduleActivationRepository
  extends TicketProjectScheduleActivationRepository
{
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  activateDueTasks(
    input: TicketProjectScheduleActivationInput,
  ): Promise<number> {
    return this.database.$transaction(async (transaction) => {
      const ids = await this.lockDueIds(
        transaction,
        'tarefas',
        input.batchSize,
      );
      if (ids.length === 0) return 0;

      const placeholders = ids.map(() => '?').join(', ');
      await transaction.$executeRawUnsafe(
        `UPDATE tarefas
         SET status = 1
         WHERE id IN (${placeholders})
           AND status = 0
           AND abertura < NOW()`,
        ...ids,
      );

      for (const taskId of ids) {
        await transaction.$executeRawUnsafe(
          `INSERT INTO inter_tarefa (
             inter_tipo,
             inter_tarefa,
             inter_user,
             inter_data,
             inter_desc
           )
           VALUES (1, ?, ?, NOW(), ?)`,
          taskId,
          input.systemActorUserId,
          TASK_ACTIVATION_DESCRIPTION,
        );
      }

      return ids.length;
    });
  }

  activateDueProjects(
    input: TicketProjectScheduleActivationInput,
  ): Promise<number> {
    return this.database.$transaction(async (transaction) => {
      const ids = await this.lockDueIds(
        transaction,
        'projetos',
        input.batchSize,
      );
      if (ids.length === 0) return 0;

      const placeholders = ids.map(() => '?').join(', ');
      await transaction.$executeRawUnsafe(
        `UPDATE projetos
         SET status = 1
         WHERE id IN (${placeholders})
           AND status = 0
           AND abertura < NOW()`,
        ...ids,
      );

      for (const projectId of ids) {
        await transaction.$executeRawUnsafe(
          `INSERT INTO inter_projeto (
             inter_tipo,
             inter_projeto,
             inter_user,
             inter_data,
             inter_desc
           )
           VALUES (1, ?, ?, NOW(), ?)`,
          projectId,
          input.systemActorUserId,
          PROJECT_ACTIVATION_DESCRIPTION,
        );
      }

      return ids.length;
    });
  }

  private async lockDueIds(
    transaction: TransactionClient,
    table: 'tarefas' | 'projetos',
    requestedBatchSize: number,
  ): Promise<number[]> {
    const batchSize = Math.min(
      500,
      Math.max(1, Math.trunc(requestedBatchSize)),
    );
    const rows = await transaction.$queryRawUnsafe<IdRow[]>(
      `SELECT id
       FROM ${table}
       WHERE status = 0
         AND abertura < NOW()
       ORDER BY abertura ASC, id ASC
       LIMIT ${batchSize}
       FOR UPDATE`,
    );

    return rows
      .map((row) => Number(row.id))
      .filter((id) => Number.isSafeInteger(id) && id > 0);
  }
}

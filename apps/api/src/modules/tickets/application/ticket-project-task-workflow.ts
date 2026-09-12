import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppPermission } from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import {
  TicketProjectTaskCommandRepository,
  type TicketProjectTaskCommandResult,
} from './ports/ticket-project-task-command.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';
import { resolveTicketReadAccess } from './ticket-read-access';

interface BaseInput {
  user: AuthenticatedUser;
  taskId: number;
}

function assertCommonResult(result: TicketProjectTaskCommandResult): void {
  if (result === 'not-found') {
    throw new NotFoundException(
      'Tarefa de projeto não encontrada ou fora do seu escopo.',
    );
  }

  if (result === 'invalid-state') {
    throw new ConflictException(
      'O estado atual da tarefa não permite esta operação.',
    );
  }
}

@Injectable()
export class TicketProjectTaskWorkflow {
  constructor(
    private readonly repository: TicketProjectTaskCommandRepository,
  ) {}

  async addInteraction(
    input: BaseInput & { description: string },
  ): Promise<void> {
    const access = resolveTicketReadAccess(input.user);
    const result = await this.repository.addInteraction({
      taskId: input.taskId,
      actorUserId: input.user.id,
      description: input.description,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    assertCommonResult(result);
  }

  async assign(
    input: BaseInput & { technicianId: number },
  ): Promise<void> {
    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsExecute,
    );

    if (
      access.ownerTechnicianId !== undefined &&
      input.technicianId !== input.user.id
    ) {
      throw new ForbiddenException(
        'Seu escopo permite iniciar apenas tarefas atribuídas a você.',
      );
    }

    const result = await this.repository.assign({
      taskId: input.taskId,
      actorUserId: input.user.id,
      technicianId: input.technicianId,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'invalid-technician') {
      throw new BadRequestException(
        'O técnico informado não existe ou está inativo.',
      );
    }

    if (result === 'blocked-by-dependency') {
      throw new ConflictException(
        'A tarefa depende de outra tarefa que ainda não foi finalizada.',
      );
    }

    assertCommonResult(result);
  }

  async putOnHold(
    input: BaseInput & { forecastAt: string; description: string },
  ): Promise<void> {
    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsHold,
    );

    const result = await this.repository.putOnHold({
      taskId: input.taskId,
      actorUserId: input.user.id,
      forecastAt: input.forecastAt,
      description: input.description,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'already-on-hold') {
      throw new ConflictException(
        'A tarefa já possui um registro de espera ativo.',
      );
    }

    assertCommonResult(result);
  }

  async resume(input: BaseInput): Promise<void> {
    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsHold,
    );

    const result = await this.repository.resume({
      taskId: input.taskId,
      actorUserId: input.user.id,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'missing-active-hold') {
      throw new ConflictException(
        'A tarefa não possui um registro de espera ativo.',
      );
    }

    assertCommonResult(result);
  }

  async reject(
    input: BaseInput & { technicianId: number; reason: string },
  ): Promise<void> {
    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsReject,
    );

    const result = await this.repository.reject({
      taskId: input.taskId,
      actorUserId: input.user.id,
      technicianId: input.technicianId,
      reason: input.reason,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'invalid-technician') {
      throw new BadRequestException(
        'O técnico informado não existe ou está inativo.',
      );
    }

    assertCommonResult(result);
  }

  async finalize(
    input: BaseInput & { description: string },
  ): Promise<void> {
    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsClose,
    );
    const allowedStatuses =
      access.ownerTechnicianId === undefined ? [2, 3] : [2];

    const result = await this.repository.finalize({
      taskId: input.taskId,
      actorUserId: input.user.id,
      description: input.description,
      allowedStatuses,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    assertCommonResult(result);
  }

  async updateProgress(
    input: BaseInput & { progress: number },
  ): Promise<void> {
    if (
      !Number.isSafeInteger(input.progress) ||
      input.progress < 0 ||
      input.progress > 100
    ) {
      throw new BadRequestException(
        'progress deve ser um inteiro entre 0 e 100.',
      );
    }

    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsExecute,
    );

    const result = await this.repository.updateProgress({
      taskId: input.taskId,
      actorUserId: input.user.id,
      progress: input.progress,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    assertCommonResult(result);
  }
}

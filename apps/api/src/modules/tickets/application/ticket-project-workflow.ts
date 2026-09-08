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
  TicketProjectCommandRepository,
  type TicketProjectCommandResult,
} from './ports/ticket-project-command.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';
import { resolveTicketReadAccess } from './ticket-read-access';

interface BaseInput {
  user: AuthenticatedUser;
  projectId: number;
}

function assertCommonResult(result: TicketProjectCommandResult): void {
  if (result === 'not-found') {
    throw new NotFoundException(
      'Projeto não encontrado ou fora do seu escopo.',
    );
  }

  if (result === 'invalid-state') {
    throw new ConflictException(
      'O estado atual do projeto não permite esta operação.',
    );
  }
}

@Injectable()
export class TicketProjectWorkflow {
  constructor(private readonly repository: TicketProjectCommandRepository) {}

  async addInteraction(
    input: BaseInput & { description: string },
  ): Promise<void> {
    const access = resolveTicketReadAccess(input.user);
    const result = await this.repository.addInteraction({
      projectId: input.projectId,
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
        'Seu escopo permite iniciar apenas projetos atribuídos a você.',
      );
    }

    const result = await this.repository.assign({
      projectId: input.projectId,
      actorUserId: input.user.id,
      technicianId: input.technicianId,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'invalid-technician') {
      throw new BadRequestException(
        'O técnico informado não existe ou está inativo.',
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
      projectId: input.projectId,
      actorUserId: input.user.id,
      forecastAt: input.forecastAt,
      description: input.description,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'already-on-hold') {
      throw new ConflictException(
        'O projeto já possui um registro de espera ativo.',
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
      projectId: input.projectId,
      actorUserId: input.user.id,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'missing-active-hold') {
      throw new ConflictException(
        'O projeto não possui um registro de espera ativo.',
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
      projectId: input.projectId,
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
      projectId: input.projectId,
      actorUserId: input.user.id,
      description: input.description,
      allowedStatuses,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    assertCommonResult(result);
  }
}

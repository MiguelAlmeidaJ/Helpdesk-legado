import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppPermission } from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketAssignmentRepository } from './ports/ticket-assignment.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';

export interface UpdateTicketAssignmentInput {
  user: AuthenticatedUser;
  ticketId: number;
  technicianId: number;
}

@Injectable()
export class UpdateTicketAssignment {
  constructor(private readonly repository: TicketAssignmentRepository) {}

  async execute(input: UpdateTicketAssignmentInput): Promise<void> {
    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsExecute,
    );

    if (
      access.ownerTechnicianId !== undefined &&
      input.technicianId !== input.user.id
    ) {
      throw new ForbiddenException(
        'Seu escopo permite iniciar apenas atendimentos atribuídos a você.',
      );
    }

    const result = await this.repository.updateAssignment({
      ticketId: input.ticketId,
      actorUserId: input.user.id,
      technicianId: input.technicianId,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'not-found') {
      throw new NotFoundException(
        'Atendimento não encontrado ou fora do seu escopo.',
      );
    }

    if (result === 'invalid-state') {
      throw new ConflictException(
        'O atendimento não está mais aguardando execução.',
      );
    }

    if (result === 'invalid-technician') {
      throw new BadRequestException(
        'O técnico informado não existe ou está inativo.',
      );
    }
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppPermission } from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketRejectionRepository } from './ports/ticket-rejection.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';

export interface RejectTicketInput {
  user: AuthenticatedUser;
  ticketId: number;
  technicianId: number;
  reason: string;
}

@Injectable()
export class RejectTicket {
  constructor(private readonly repository: TicketRejectionRepository) {}

  async execute(input: RejectTicketInput): Promise<void> {
    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsReject,
    );

    const result = await this.repository.reject({
      ticketId: input.ticketId,
      actorUserId: input.user.id,
      technicianId: input.technicianId,
      reason: input.reason,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'not-found') {
      throw new NotFoundException(
        'Atendimento não encontrado ou fora do seu escopo.',
      );
    }

    if (result === 'invalid-state') {
      throw new ConflictException(
        'Somente atendimentos em execução podem ser recusados.',
      );
    }

    if (result === 'invalid-technician') {
      throw new BadRequestException(
        'O técnico informado não existe ou está inativo.',
      );
    }
  }
}

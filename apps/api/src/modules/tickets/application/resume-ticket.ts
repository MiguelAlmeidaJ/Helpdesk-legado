import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppPermission } from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketHoldRepository } from './ports/ticket-hold.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';

export interface ResumeTicketInput {
  user: AuthenticatedUser;
  ticketId: number;
}

@Injectable()
export class ResumeTicket {
  constructor(private readonly repository: TicketHoldRepository) {}

  async execute(input: ResumeTicketInput): Promise<void> {
    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsHold,
    );

    const result = await this.repository.resume({
      ticketId: input.ticketId,
      actorUserId: input.user.id,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'not-found') {
      throw new NotFoundException(
        'Atendimento não encontrado ou fora do seu escopo.',
      );
    }

    if (result === 'invalid-state') {
      throw new ConflictException(
        'Somente atendimentos em espera podem ser retomados.',
      );
    }

    if (result === 'missing-active-hold') {
      throw new ConflictException(
        'O atendimento não possui um registro de espera ativo.',
      );
    }
  }
}

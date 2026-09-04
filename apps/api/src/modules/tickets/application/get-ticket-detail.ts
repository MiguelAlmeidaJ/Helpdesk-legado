import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TicketDetailResponse } from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketDetailRepository } from './ports/ticket-detail.repository';
import { resolveTicketReadAccess } from './ticket-read-access';

export interface GetTicketDetailInput {
  user: AuthenticatedUser;
  ticketId: number;
}

@Injectable()
export class GetTicketDetail {
  constructor(private readonly repository: TicketDetailRepository) {}

  async execute(input: GetTicketDetailInput): Promise<TicketDetailResponse> {
    const access = resolveTicketReadAccess(input.user);

    const ticket = await this.repository.findById({
      ticketId: input.ticketId,
      userId: input.user.id,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (!ticket) {
      throw new NotFoundException(
        'Atendimento não encontrado ou fora do seu escopo.',
      );
    }

    return ticket;
  }
}

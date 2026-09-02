import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketInteractionRepository } from './ports/ticket-interaction.repository';
import { resolveTicketReadAccess } from './ticket-read-access';

export interface AddTicketInteractionInput {
  user: AuthenticatedUser;
  ticketId: number;
  description: string;
}

@Injectable()
export class AddTicketInteraction {
  constructor(private readonly repository: TicketInteractionRepository) {}

  async execute(input: AddTicketInteractionInput): Promise<void> {
    const access = resolveTicketReadAccess(input.user);
    const created = await this.repository.create({
      ticketId: input.ticketId,
      userId: input.user.id,
      description: input.description,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (!created) {
      throw new NotFoundException(
        'Atendimento não encontrado ou fora do seu escopo.',
      );
    }
  }
}

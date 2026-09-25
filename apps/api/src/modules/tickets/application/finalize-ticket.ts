import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AppPermission, TicketStatus } from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketCloseRepository } from './ports/ticket-close.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';

@Injectable()
export class FinalizeTicket {
  constructor(private readonly repository: TicketCloseRepository) {}

  async execute(input: {
    user: AuthenticatedUser;
    ticketId: number;
    description: string;
  }): Promise<void> {
    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsClose,
    );

    const allowedStatuses =
      access.ownerTechnicianId === undefined
        ? [TicketStatus.InProgress, TicketStatus.OnHold, TicketStatus.Completed]
        : [TicketStatus.InProgress];

    const result = await this.repository.finalize({
      ticketId: input.ticketId,
      actorUserId: input.user.id,
      description: input.description,
      allowedStatuses,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'not-found') {
      throw new NotFoundException('Atendimento não encontrado ou fora do seu escopo.');
    }
    if (result === 'invalid-state') {
      throw new ConflictException('O estado atual não permite finalização.');
    }
  }
}

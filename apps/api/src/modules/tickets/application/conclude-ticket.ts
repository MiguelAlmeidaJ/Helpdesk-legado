import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AppPermission } from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketCloseRepository } from './ports/ticket-close.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';

@Injectable()
export class ConcludeTicket {
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

    const result = await this.repository.conclude({
      ticketId: input.ticketId,
      actorUserId: input.user.id,
      description: input.description,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'not-found') {
      throw new NotFoundException('Atendimento não encontrado ou fora do seu escopo.');
    }
    if (result === 'invalid-state') {
      throw new ConflictException('Somente atendimentos em execução podem ser concluídos.');
    }
    if (result === 'active-completion') {
      throw new ConflictException('O atendimento já possui uma conclusão ativa.');
    }
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppPermission } from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketHoldRepository } from './ports/ticket-hold.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';

export interface PutTicketOnHoldInput {
  user: AuthenticatedUser;
  ticketId: number;
  forecastAt: Date;
  cause: string;
  description: string;
}

@Injectable()
export class PutTicketOnHold {
  constructor(private readonly repository: TicketHoldRepository) {}

  async execute(input: PutTicketOnHoldInput): Promise<void> {
    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsHold,
    );

    const result = await this.repository.putOnHold({
      ticketId: input.ticketId,
      actorUserId: input.user.id,
      forecastAt: input.forecastAt,
      cause: input.cause,
      description: input.description,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'not-found') {
      throw new NotFoundException(
        'Atendimento não encontrado ou fora do seu escopo.',
      );
    }

    if (result === 'invalid-state') {
      throw new ConflictException(
        'Somente atendimentos aguardando ou em execução podem entrar em espera.',
      );
    }

    if (result === 'already-on-hold') {
      throw new ConflictException(
        'O atendimento já possui um registro de espera ativo.',
      );
    }
  }
}

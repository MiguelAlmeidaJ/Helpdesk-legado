import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketAssignmentRepository } from './ports/ticket-assignment.repository';

@Injectable()
export class AcceptTicket {
  constructor(private readonly repository: TicketAssignmentRepository) {}

  async execute(user: AuthenticatedUser, ticketId: number): Promise<void> {
    const result = await this.repository.updateAssignment({
      ticketId,
      actorUserId: user.id,
      technicianId: user.id,
      ownerTechnicianId: user.id,
    });

    if (result === 'not-found') {
      throw new NotFoundException(
        'Atendimento não encontrado, fora do seu escopo ou atribuído a outro técnico.',
      );
    }

    if (result === 'invalid-state') {
      throw new ConflictException(
        'Somente atendimentos aguardando execução podem ser aceitos.',
      );
    }

    if (result === 'invalid-technician') {
      throw new BadRequestException('Seu usuário não está disponível como técnico.');
    }
  }
}

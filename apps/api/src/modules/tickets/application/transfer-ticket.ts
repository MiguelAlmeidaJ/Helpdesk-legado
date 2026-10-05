import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppPermission, TicketStatus } from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketAssignmentRepository } from './ports/ticket-assignment.repository';
import { TicketRejectionRepository } from './ports/ticket-rejection.repository';
import { TicketDetailRepository } from './ports/ticket-detail.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';

@Injectable()
export class TransferTicket {
  constructor(
    private readonly assignmentRepository: TicketAssignmentRepository,
    private readonly rejectionRepository: TicketRejectionRepository,
    private readonly detailRepository: TicketDetailRepository,
  ) {}

  async listTechnicians(user: AuthenticatedUser) {
    const access = resolveTicketOperationAccess(user, AppPermission.TicketsEdit);
    return this.assignmentRepository.listTechnicians(access.ownerTechnicianId);
  }

  async execute(
    user: AuthenticatedUser,
    ticketId: number,
    technicianId: number,
  ): Promise<void> {
    const access = resolveTicketOperationAccess(user, AppPermission.TicketsEdit);
    const ticket = await this.detailRepository.findById({
      ticketId,
      userId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (!ticket) {
      throw new NotFoundException(
        'Atendimento não encontrado ou fora do seu escopo.',
      );
    }

    if (ticket.technician.id === technicianId) {
      throw new BadRequestException(
        'Selecione um técnico diferente do responsável atual.',
      );
    }

    if (ticket.status === TicketStatus.WaitingExecution) {
      const result = await this.assignmentRepository.updateAssignment({
        ticketId,
        actorUserId: user.id,
        technicianId,
        ownerTechnicianId: access.ownerTechnicianId,
      });
      this.assertResult(result);
      return;
    }

    if (ticket.status === TicketStatus.InProgress) {
      const result = await this.rejectionRepository.reject({
        ticketId,
        actorUserId: user.id,
        technicianId,
        reason: 'Transferência realizada pela lista de atendimentos.',
        ownerTechnicianId: access.ownerTechnicianId,
      });
      this.assertResult(result);
      return;
    }

    throw new ConflictException(
      'A transferência rápida está disponível apenas para atendimentos aguardando execução ou em execução.',
    );
  }

  private assertResult(
    result: 'updated' | 'not-found' | 'invalid-state' | 'invalid-technician',
  ) {
    if (result === 'not-found') {
      throw new NotFoundException(
        'Atendimento não encontrado ou fora do seu escopo.',
      );
    }
    if (result === 'invalid-state') {
      throw new ConflictException('O atendimento mudou de estado.');
    }
    if (result === 'invalid-technician') {
      throw new BadRequestException(
        'O técnico informado não existe ou está inativo.',
      );
    }
  }
}

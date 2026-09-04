import { Injectable } from '@nestjs/common';
import {
  AppPermission,
  type TicketRejectionOptionsResponse,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketAssignmentRepository } from './ports/ticket-assignment.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';

@Injectable()
export class ListTicketRejectionOptions {
  constructor(private readonly assignments: TicketAssignmentRepository) {}

  async execute(
    user: AuthenticatedUser,
  ): Promise<TicketRejectionOptionsResponse> {
    resolveTicketOperationAccess(
      user,
      AppPermission.TicketsReject,
    );

    const technicians = await this.assignments.listTechnicians();

    return {
      technicians: [
        {
          id: 0,
          name: 'Não atribuído',
        },
        ...technicians,
      ],
    };
  }
}

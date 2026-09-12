import { Injectable } from '@nestjs/common';
import {
  AppPermission,
  type TicketAssignmentOptionsResponse,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketAssignmentRepository } from './ports/ticket-assignment.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';

@Injectable()
export class ListTicketAssignmentOptions {
  constructor(private readonly repository: TicketAssignmentRepository) {}

  async execute(
    user: AuthenticatedUser,
  ): Promise<TicketAssignmentOptionsResponse> {
    const access = resolveTicketOperationAccess(
      user,
      AppPermission.TicketsExecute,
    );

    const technicians = await this.repository.listTechnicians(
      access.ownerTechnicianId,
    );

    return {
      technicians,
    };
  }
}

import type { TicketAssignmentOption } from '@helpdesk/contracts';

export type UpdateTicketAssignmentPersistenceResult =
  | 'updated'
  | 'not-found'
  | 'invalid-state'
  | 'invalid-technician';

export interface UpdateTicketAssignmentPersistenceInput {
  ticketId: number;
  actorUserId: number;
  technicianId: number;
  ownerTechnicianId?: number;
}

export abstract class TicketAssignmentRepository {
  abstract listTechnicians(
    onlyUserId?: number,
  ): Promise<TicketAssignmentOption[]>;

  abstract updateAssignment(
    input: UpdateTicketAssignmentPersistenceInput,
  ): Promise<UpdateTicketAssignmentPersistenceResult>;
}

export type RejectTicketPersistenceResult =
  | 'updated'
  | 'not-found'
  | 'invalid-state'
  | 'invalid-technician';

export interface RejectTicketPersistenceInput {
  ticketId: number;
  actorUserId: number;
  technicianId: number;
  reason: string;
  ownerTechnicianId?: number;
}

export abstract class TicketRejectionRepository {
  abstract reject(
    input: RejectTicketPersistenceInput,
  ): Promise<RejectTicketPersistenceResult>;
}

export type PutTicketOnHoldPersistenceResult =
  | 'updated'
  | 'not-found'
  | 'invalid-state'
  | 'already-on-hold';

export type ResumeTicketPersistenceResult =
  | 'updated'
  | 'not-found'
  | 'invalid-state'
  | 'missing-active-hold';

export interface PutTicketOnHoldPersistenceInput {
  ticketId: number;
  actorUserId: number;
  forecastAt: Date;
  cause: string;
  description: string;
  ownerTechnicianId?: number;
}

export interface ResumeTicketPersistenceInput {
  ticketId: number;
  actorUserId: number;
  ownerTechnicianId?: number;
}

export abstract class TicketHoldRepository {
  abstract putOnHold(
    input: PutTicketOnHoldPersistenceInput,
  ): Promise<PutTicketOnHoldPersistenceResult>;

  abstract resume(
    input: ResumeTicketPersistenceInput,
  ): Promise<ResumeTicketPersistenceResult>;
}

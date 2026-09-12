import type { TicketStatus } from '@helpdesk/contracts';

export type TicketClosePersistenceResult =
  | 'updated'
  | 'not-found'
  | 'invalid-state'
  | 'active-completion';

export interface ConcludeTicketPersistenceInput {
  ticketId: number;
  actorUserId: number;
  description: string;
  ownerTechnicianId?: number;
}

export interface FinalizeTicketPersistenceInput {
  ticketId: number;
  actorUserId: number;
  description: string;
  allowedStatuses: TicketStatus[];
  ownerTechnicianId?: number;
}

export abstract class TicketCloseRepository {
  abstract conclude(input: ConcludeTicketPersistenceInput):
    Promise<TicketClosePersistenceResult>;
  abstract finalize(input: FinalizeTicketPersistenceInput):
    Promise<TicketClosePersistenceResult>;
}

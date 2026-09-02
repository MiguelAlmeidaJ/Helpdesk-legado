import type { TicketDetailResponse } from '@helpdesk/contracts';

export interface TicketDetailRepositoryQuery {
  ticketId: number;
  userId: number;
  ownerTechnicianId?: number;
}

export abstract class TicketDetailRepository {
  abstract findById(
    query: TicketDetailRepositoryQuery,
  ): Promise<TicketDetailResponse | null>;
}

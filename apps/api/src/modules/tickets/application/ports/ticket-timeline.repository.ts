import type { TicketTimelineResponse } from '@helpdesk/contracts';

export interface TicketTimelineQuery {
  technicianId: number | null;
  date: string;
  limit: number;
}

export abstract class TicketTimelineRepository {
  abstract find(query: TicketTimelineQuery): Promise<TicketTimelineResponse>;
}

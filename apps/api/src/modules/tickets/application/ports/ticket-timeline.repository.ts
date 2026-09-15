import type { TicketTimelineResponse } from '@helpdesk/contracts';

export abstract class TicketTimelineRepository {
  abstract last24Hours(limit: number): Promise<TicketTimelineResponse>;
}

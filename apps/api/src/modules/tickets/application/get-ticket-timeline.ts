import { Injectable } from '@nestjs/common';
import type { TicketTimelineResponse } from '@helpdesk/contracts';
import { TicketTimelineRepository } from './ports/ticket-timeline.repository';

@Injectable()
export class GetTicketTimeline {
  constructor(private readonly repository: TicketTimelineRepository) {}

  execute(limit = 200): Promise<TicketTimelineResponse> {
    const safeLimit = Number.isSafeInteger(limit)
      ? Math.max(1, Math.min(500, limit))
      : 200;

    return this.repository.last24Hours(safeLimit);
  }
}

import { Injectable } from '@nestjs/common';
import type { TicketTimelineResponse } from '@helpdesk/contracts';
import { TicketTimelineRepository } from './ports/ticket-timeline.repository';

@Injectable()
export class GetTicketTimeline {
  constructor(private readonly repository: TicketTimelineRepository) {}

  execute(
    technicianId: number | null,
    date: string,
    limit = 500,
  ): Promise<TicketTimelineResponse> {
    const safeLimit = Number.isSafeInteger(limit)
      ? Math.max(1, Math.min(500, limit))
      : 500;

    return this.repository.find({
      technicianId,
      date,
      limit: safeLimit,
    });
  }
}

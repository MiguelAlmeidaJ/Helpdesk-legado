import { Injectable } from '@nestjs/common';
import { DueScheduledTicketRepository } from './ports/due-scheduled-ticket.repository';

export interface ActivateDueScheduledTicketsResult {
  candidates: number;
  activated: number;
  skipped: number;
}

@Injectable()
export class ActivateDueScheduledTickets {
  constructor(private readonly repository: DueScheduledTicketRepository) {}

  async execute(limit: number): Promise<ActivateDueScheduledTicketsResult> {
    const tickets = await this.repository.findDue(limit);
    let activated = 0;
    let skipped = 0;

    for (const ticket of tickets) {
      const changed = await this.repository.activateDue(ticket.ticketId);

      if (changed) {
        activated += 1;
      } else {
        skipped += 1;
      }
    }

    return {
      candidates: tickets.length,
      activated,
      skipped,
    };
  }
}

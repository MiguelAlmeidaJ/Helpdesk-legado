import { Injectable } from '@nestjs/common';
import { DueTicketHoldRepository } from './ports/due-ticket-hold.repository';

export interface ResumeDueTicketHoldsResult {
  candidates: number;
  resumed: number;
  skipped: number;
}

@Injectable()
export class ResumeDueTicketHolds {
  constructor(private readonly repository: DueTicketHoldRepository) {}

  async execute(limit: number): Promise<ResumeDueTicketHoldsResult> {
    const dueHolds = await this.repository.findDue(limit);
    let resumed = 0;
    let skipped = 0;

    for (const hold of dueHolds) {
      const changed = await this.repository.resumeDue({
        ticketId: hold.ticketId,
        holdId: hold.holdId,
      });

      if (changed) {
        resumed += 1;
      } else {
        skipped += 1;
      }
    }

    return {
      candidates: dueHolds.length,
      resumed,
      skipped,
    };
  }
}

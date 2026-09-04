import { Injectable, Logger } from '@nestjs/common';
import { calculateNextTicketRecurrence } from '../domain/calculate-next-ticket-recurrence';
import { TicketRecurrenceRepository } from './ports/ticket-recurrence.repository';

export interface ProcessDueTicketRecurrencesResult {
  candidates: number;
  created: number;
  skipped: number;
  invalid: number;
}

@Injectable()
export class ProcessDueTicketRecurrences {
  private readonly logger = new Logger(ProcessDueTicketRecurrences.name);

  constructor(private readonly repository: TicketRecurrenceRepository) {}

  async execute(limit: number): Promise<ProcessDueTicketRecurrencesResult> {
    const recurrences = await this.repository.findDue(limit);
    let created = 0;
    let skipped = 0;
    let invalid = 0;

    for (const recurrence of recurrences) {
      const nextRecurrenceAt = calculateNextTicketRecurrence(
        recurrence.recurrenceAt,
        recurrence.recurrenceRule,
        recurrence.week,
      );

      if (!nextRecurrenceAt) {
        invalid += 1;
        this.logger.warn(
          `Recorrencia invalida ignorada: atendimento=${recurrence.ticketId}, regra=${recurrence.recurrenceRule}, data=${recurrence.recurrenceAt}.`,
        );
        continue;
      }

      const changed = await this.repository.advanceAndCreate({
        ticketId: recurrence.ticketId,
        recurrenceAt: recurrence.recurrenceAt,
        nextRecurrenceAt,
      });

      if (changed) {
        created += 1;
      } else {
        skipped += 1;
      }
    }

    return {
      candidates: recurrences.length,
      created,
      skipped,
      invalid,
    };
  }
}

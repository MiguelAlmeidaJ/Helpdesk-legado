export type TicketRecurrenceSource = 'canonical' | 'legacy';

export interface DueTicketRecurrence {
  recurrenceId: number;
  templateTicketId: number;
  source: TicketRecurrenceSource;
  recurrenceAt: string;
  recurrenceRule: number;
  week: string | null;
}

export interface AdvanceTicketRecurrenceInput {
  recurrenceId: number;
  templateTicketId: number;
  source: TicketRecurrenceSource;
  recurrenceAt: string;
  nextRecurrenceAt: string;
}

export abstract class TicketRecurrenceRepository {
  abstract findDue(limit: number): Promise<DueTicketRecurrence[]>;

  abstract advanceAndCreate(
    input: AdvanceTicketRecurrenceInput,
  ): Promise<boolean>;
}

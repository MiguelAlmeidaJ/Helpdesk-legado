export interface DueTicketRecurrence {
  ticketId: number;
  recurrenceAt: string;
  recurrenceRule: number;
  week: string | null;
}

export interface AdvanceTicketRecurrenceInput {
  ticketId: number;
  recurrenceAt: string;
  nextRecurrenceAt: string;
}

export abstract class TicketRecurrenceRepository {
  abstract findDue(limit: number): Promise<DueTicketRecurrence[]>;

  abstract advanceAndCreate(
    input: AdvanceTicketRecurrenceInput,
  ): Promise<boolean>;
}

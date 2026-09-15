export interface DueTicketHold {
  ticketId: number;
  holdId: number;
}

export interface ResumeDueTicketHoldInput {
  ticketId: number;
  holdId: number;
}

export abstract class DueTicketHoldRepository {
  abstract findDue(limit: number): Promise<DueTicketHold[]>;

  abstract resumeDue(input: ResumeDueTicketHoldInput): Promise<boolean>;
}

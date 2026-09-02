export interface DueScheduledTicket {
  ticketId: number;
}

export abstract class DueScheduledTicketRepository {
  abstract findDue(limit: number): Promise<DueScheduledTicket[]>;

  abstract activateDue(ticketId: number): Promise<boolean>;
}

export interface CreateTicketInteractionPersistenceInput {
  ticketId: number;
  userId: number;
  description: string;
  ownerTechnicianId?: number;
}

export abstract class TicketInteractionRepository {
  abstract create(
    input: CreateTicketInteractionPersistenceInput,
  ): Promise<boolean>;
}

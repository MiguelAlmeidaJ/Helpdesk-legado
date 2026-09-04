import type {
  TicketCatalogOption,
  UpdateTicketClassificationRequest,
} from '@helpdesk/contracts';

export type UpdateTicketClassificationPersistenceResult =
  | 'updated'
  | 'not-found'
  | 'invalid-catalog';

export interface UpdateTicketClassificationPersistenceInput
  extends UpdateTicketClassificationRequest {
  ticketId: number;
  actorUserId: number;
  ownerTechnicianId?: number;
}

export abstract class TicketClassificationRepository {
  abstract listCategories(): Promise<TicketCatalogOption[]>;
  abstract listSubcategories(categoryId: number): Promise<TicketCatalogOption[]>;
  abstract listItems(subcategoryId: number): Promise<TicketCatalogOption[]>;
  abstract update(
    input: UpdateTicketClassificationPersistenceInput,
  ): Promise<UpdateTicketClassificationPersistenceResult>;
}

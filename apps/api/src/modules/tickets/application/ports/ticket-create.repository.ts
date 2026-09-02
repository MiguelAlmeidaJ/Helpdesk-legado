import type { CreateTicketRequest, TicketCatalogOption, TicketCreateCatalogsResponse } from '@helpdesk/contracts';

export type CreateTicketPersistenceResult =
  | { id: number; status: number }
  | 'invalid-reference'
  | 'forbidden-client';

export abstract class TicketCreateRepository {
  abstract catalogs(actorUserId: number): Promise<TicketCreateCatalogsResponse>;
  abstract requesters(actorUserId: number, clientId: number): Promise<TicketCatalogOption[]>;
  abstract locations(actorUserId: number, clientId: number): Promise<TicketCatalogOption[]>;
  abstract create(actorUserId: number, input: CreateTicketRequest): Promise<CreateTicketPersistenceResult>;
}

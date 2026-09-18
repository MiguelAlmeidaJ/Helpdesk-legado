import type {
  DevOpsTicketCreateRequest,
  DevOpsTicketCreateResponse,
  TicketCatalogOption,
  TicketCreateCatalogsResponse,
} from '@helpdesk/contracts';

export type DevOpsTicketCreatePersistenceResult =
  | DevOpsTicketCreateResponse
  | 'invalid-reference'
  | 'forbidden-client';

export abstract class DevOpsTicketCreateRepository {
  abstract catalogs(actorUserId: number): Promise<TicketCreateCatalogsResponse>;
  abstract requesters(
    actorUserId: number,
    clientId: number,
  ): Promise<TicketCatalogOption[]>;
  abstract locations(
    actorUserId: number,
    clientId: number,
  ): Promise<TicketCatalogOption[]>;
  abstract subcategories(categoryId: number): Promise<TicketCatalogOption[]>;
  abstract items(subcategoryId: number): Promise<TicketCatalogOption[]>;
  abstract create(
    actorUserId: number,
    data: DevOpsTicketCreateRequest,
  ): Promise<DevOpsTicketCreatePersistenceResult>;
}

import type {
  MarketingTicketCatalogsResponse,
  MarketingTicketCreateRequest,
  MarketingTicketCreateResponse,
  MarketingTicketDetailResponse,
  MarketingTicketListResponse,
  MarketingTicketUpdateRequest,
  TicketCatalogOption,
} from '@helpdesk/contracts';

export interface MarketingTicketScope {
  actorUserId: number;
  ownerTechnicianId?: number;
  /** Assignment may claim an unassigned ticket without granting access to another technician's ticket. */
  includeUnassigned?: boolean;
}

export interface MarketingTicketListPersistenceInput extends MarketingTicketScope {
  page: number;
  limit: number;
  statuses: number[];
  clientId?: number;
  requesterId?: number;
  technicianId?: number;
  id?: number;
  search?: string;
  openedFrom?: string;
  openedTo?: string;
  sort: 'status' | 'id' | 'client' | 'openedAt' | 'level' | 'technician';
  direction: 'asc' | 'desc';
}

export interface MarketingTicketCreatePersistenceInput extends MarketingTicketScope {
  data: MarketingTicketCreateRequest;
}

export interface MarketingTicketUpdatePersistenceInput extends MarketingTicketScope {
  ticketId: number;
  data: MarketingTicketUpdateRequest;
}

export interface MarketingTicketInteractionPersistenceInput extends MarketingTicketScope {
  ticketId: number;
  description: string;
}

export interface MarketingTicketAssignmentPersistenceInput extends MarketingTicketScope {
  ticketId: number;
  technicianId: number;
}

export interface MarketingTicketHoldPersistenceInput extends MarketingTicketScope {
  ticketId: number;
  forecastAt: string;
  description: string;
}

export interface MarketingTicketRejectPersistenceInput extends MarketingTicketScope {
  ticketId: number;
  technicianId: number;
  reason: string;
}

export interface MarketingTicketFinalizePersistenceInput extends MarketingTicketScope {
  ticketId: number;
  description: string;
  allowedStatuses: number[];
}

export type MarketingTicketCommandResult =
  | 'updated'
  | 'not-found'
  | 'invalid-state'
  | 'invalid-reference'
  | 'forbidden-client'
  | 'already-on-hold'
  | 'missing-active-hold';

export abstract class MarketingTicketRepository {
  abstract catalogs(actorUserId: number): Promise<MarketingTicketCatalogsResponse>;
  abstract requesters(actorUserId: number, clientId: number): Promise<TicketCatalogOption[]>;
  abstract locations(actorUserId: number, clientId: number): Promise<TicketCatalogOption[]>;
  abstract list(input: MarketingTicketListPersistenceInput): Promise<MarketingTicketListResponse>;
  abstract detail(input: MarketingTicketScope & { ticketId: number }): Promise<MarketingTicketDetailResponse | null>;
  abstract create(input: MarketingTicketCreatePersistenceInput): Promise<MarketingTicketCreateResponse | 'invalid-reference' | 'forbidden-client'>;
  abstract update(input: MarketingTicketUpdatePersistenceInput): Promise<MarketingTicketCommandResult>;
  abstract addInteraction(input: MarketingTicketInteractionPersistenceInput): Promise<MarketingTicketCommandResult>;
  abstract assign(input: MarketingTicketAssignmentPersistenceInput): Promise<MarketingTicketCommandResult>;
  abstract putOnHold(input: MarketingTicketHoldPersistenceInput): Promise<MarketingTicketCommandResult>;
  abstract resume(input: MarketingTicketScope & { ticketId: number }): Promise<MarketingTicketCommandResult>;
  abstract reject(input: MarketingTicketRejectPersistenceInput): Promise<MarketingTicketCommandResult>;
  abstract finalize(input: MarketingTicketFinalizePersistenceInput): Promise<MarketingTicketCommandResult>;
  abstract activateDue(limit: number): Promise<{ activated: number; truncated: boolean }>;
}

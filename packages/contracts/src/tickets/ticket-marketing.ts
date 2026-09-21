import type { PaginatedResponse } from '../common/pagination';
import type { TicketCatalogOption } from './ticket-classification';
import type { TicketListParty } from './ticket-list';

export type MarketingTicketStatus = 0 | 1 | 2 | 3 | 4;

export interface MarketingTicketCatalogsResponse {
  clients: TicketCatalogOption[];
  technicians: TicketCatalogOption[];
  types: TicketCatalogOption[];
  categories: TicketCatalogOption[];
  subcategories: TicketCatalogOption[];
  levels: TicketCatalogOption[];
  forms: TicketCatalogOption[];
}

export interface MarketingTicketCreateRequest {
  name: string;
  clientId: number;
  requesterId: number;
  locationId: number;
  typeId: number;
  categoryId: number;
  subcategoryId: number;
  itemId: number;
  levelId: number;
  formId: number;
  openingDescription: string;
  /** Legacy wall-clock time: YYYY-MM-DDTHH:mm[:ss]. */
  openingAt: string;
  technicianId: number;
}

export interface MarketingTicketCreateResponse {
  id: number;
  status: MarketingTicketStatus;
}

export interface MarketingTicketUpdateRequest {
  typeId: number;
  categoryId: number;
  subcategoryId: number;
  itemId: number;
  levelId: number;
  formId: number;
  openingDescription: string;
}

export interface MarketingTicketInteractionRequest {
  description: string;
}

export interface MarketingTicketAssignmentRequest {
  technicianId: number;
}

export interface MarketingTicketHoldRequest {
  /** Legacy wall-clock time: YYYY-MM-DDTHH:mm[:ss]. */
  forecastAt: string;
  description: string;
}

export interface MarketingTicketRejectionRequest {
  technicianId: number;
  reason: string;
}

export interface MarketingTicketFinalizeRequest {
  description: string;
}

export interface MarketingTicketListItem {
  id: number;
  name: string;
  openingDescription: string | null;
  closingDescription: string | null;
  openedAt: string | null;
  closedAt: string | null;
  status: MarketingTicketStatus;
  statusLabel: string;
  form: number | null;
  recurrent: boolean;
  client: TicketListParty;
  requester: TicketListParty;
  location: TicketListParty;
  type: TicketListParty;
  category: TicketListParty;
  subcategory: TicketListParty;
  level: TicketListParty;
  item: TicketListParty;
  technician: TicketListParty;
  waitSeconds: number;
  lastActivityAt: string | null;
}

export type MarketingTicketListResponse =
  PaginatedResponse<MarketingTicketListItem>;

export interface MarketingTicketTimelineItem {
  id: number;
  type: number;
  at: string | null;
  description: string | null;
  user: TicketListParty;
}

export interface MarketingTicketDetailResponse
  extends MarketingTicketListItem {
  timeline: MarketingTicketTimelineItem[];
}


export type MarketingTechnicianAvailabilityState =
  | 'available'
  | 'busy'
  | 'offline';

export interface MarketingAvailabilityTechnician {
  id: number;
  name: string;
  online: boolean;
  state: MarketingTechnicianAvailabilityState;
  executing: MarketingTicketListItem[];
}

export interface MarketingAvailabilitySummary {
  scheduled: number;
  waitingExecution: number;
  inProgress: number;
  onHold: number;
  finishedToday: number;
  onlineTechnicians: number;
  availableTechnicians: number;
  busyTechnicians: number;
}

export interface MarketingAvailabilityResponse {
  generatedAt: string;
  onlineWindowMinutes: 10;
  summary: MarketingAvailabilitySummary;
  technicians: MarketingAvailabilityTechnician[];
  scheduled: MarketingTicketListItem[];
  waitingExecution: MarketingTicketListItem[];
  onHold: MarketingTicketListItem[];
  finishedToday: MarketingTicketListItem[];
}

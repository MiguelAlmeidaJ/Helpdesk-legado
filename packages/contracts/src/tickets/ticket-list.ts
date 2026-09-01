import type { PaginatedResponse } from '../common/pagination';
import type { TicketStatus } from './ticket-status';

export type TicketListSort =
  | 'id'
  | 'client'
  | 'openedAt'
  | 'level'
  | 'priority'
  | 'technician'
  | 'status';

export type SortDirection = 'asc' | 'desc';

export interface TicketListFilters {
  statuses: TicketStatus[];
  clientId?: number;
  requesterId?: number;
  ticketId?: number;
  search?: string;
  typeIds: number[];
  technicianIds: number[];
  openedFrom?: string;
  openedTo?: string;
  sort: TicketListSort;
  direction: SortDirection;
}

export interface TicketListParty {
  id: number | null;
  name: string | null;
}

export interface TicketListItem {
  id: number;
  status: TicketStatus;
  statusLabel: string;
  level: number | null;
  priority: number | null;
  form: number | null;
  recurrent: boolean;
  openedAt: string | null;
  closedAt: string | null;
  openingDescription: string | null;
  closingDescription: string | null;
  client: TicketListParty;
  requester: TicketListParty;
  location: TicketListParty;
  category: TicketListParty;
  subcategory: TicketListParty;
  item: TicketListParty;
  technician: TicketListParty;
}

export interface TicketListResponse extends PaginatedResponse<TicketListItem> {
  filters: TicketListFilters;
}

import type { PaginatedResponse } from '../common/pagination';
import type { TicketStatus } from './ticket-status';

export type TicketListSort =
  | 'sla'
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

export interface TicketListSla {
  remainingSeconds: number | null;
  order: number;
  bellOrder: number;
  waitSeconds: number;
  lastActivityAt: string | null;
  latestWait: {
    id: number | null;
    startedAt: string | null;
    scheduledResumeAt: string | null;
  };
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
  sla: TicketListSla;
}

export type TicketStatusCardKey =
  | 'waiting'
  | 'inProgress'
  | 'onHold'
  | 'completed'
  | 'finished'
  | 'scheduled'
  | 'all';

export interface TicketStatusCard {
  key: TicketStatusCardKey;
  label: string;
  statuses: TicketStatus[];
  total: number;
}

export interface TicketFilterOption {
  id: number;
  name: string;
}

export interface TicketFilterOptions {
  clients: TicketFilterOption[];
  requesters: TicketFilterOption[];
  technicians: TicketFilterOption[];
}

export interface TicketListResponse extends PaginatedResponse<TicketListItem> {
  filters: TicketListFilters;
  statusCards: TicketStatusCard[];
  options: TicketFilterOptions;
}

import type { PaginatedResponse } from '../common/pagination';
import type { TicketStatus } from '../tickets/ticket-status';

export type ImprovementListSort =
  | 'id'
  | 'client'
  | 'openedAt'
  | 'level'
  | 'form'
  | 'technician'
  | 'status';

export type ImprovementSortDirection = 'asc' | 'desc';

export interface ImprovementListFilters {
  statuses: TicketStatus[];
  clientId?: number;
  requesterId?: number;
  improvementId?: number;
  technicianIds: number[];
  openedFrom?: string;
  openedTo?: string;
  sort: ImprovementListSort;
  direction: ImprovementSortDirection;
}

export interface ImprovementListParty {
  id: number | null;
  name: string | null;
}

export interface ImprovementListItem {
  id: number;
  status: TicketStatus;
  statusLabel: string;
  type: number | null;
  level: number | null;
  form: number | null;
  recurrent: boolean;
  recurring: boolean;
  openedAt: string | null;
  closedAt: string | null;
  openingDescription: string | null;
  closingDescription: string | null;
  client: ImprovementListParty;
  requester: ImprovementListParty;
  location: ImprovementListParty;
  category: ImprovementListParty;
  subcategory: ImprovementListParty;
  item: ImprovementListParty;
  technician: ImprovementListParty;
}

export type ImprovementStatusCardKey =
  | 'waiting'
  | 'inProgress'
  | 'onHold'
  | 'completed'
  | 'finished'
  | 'scheduled'
  | 'all';

export interface ImprovementStatusCard {
  key: ImprovementStatusCardKey;
  label: string;
  statuses: TicketStatus[];
  total: number;
}

export interface ImprovementFilterOption {
  id: number;
  name: string;
}

export interface ImprovementFilterOptions {
  clients: ImprovementFilterOption[];
  requesters: ImprovementFilterOption[];
  technicians: ImprovementFilterOption[];
}

export interface ImprovementListResponse
  extends PaginatedResponse<ImprovementListItem> {
  filters: ImprovementListFilters;
  statusCards: ImprovementStatusCard[];
  options: ImprovementFilterOptions;
}

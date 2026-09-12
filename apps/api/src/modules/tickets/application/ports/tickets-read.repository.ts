import type {
  TicketFilterOptions,
  TicketListFilters,
  TicketListItem,
  TicketStatusCard,
} from '@helpdesk/contracts';

export interface TicketsReadRepositoryQuery {
  userId: number;
  filters: TicketListFilters;
  page: number;
  limit: number;
  ownerTechnicianId?: number;
}

export interface TicketsReadRepositoryResult {
  data: TicketListItem[];
  total: number;
  statusCards: TicketStatusCard[];
  options: TicketFilterOptions;
}

export abstract class TicketsReadRepository {
  abstract list(
    query: TicketsReadRepositoryQuery,
  ): Promise<TicketsReadRepositoryResult>;
}

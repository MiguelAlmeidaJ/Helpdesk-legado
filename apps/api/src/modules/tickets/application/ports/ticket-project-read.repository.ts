import type {
  TicketFilterOptions,
  TicketProjectFilters,
  TicketProjectListItem,
  TicketProjectTaskFilters,
  TicketProjectTaskListItem,
} from '@helpdesk/contracts';

export interface TicketProjectReadQuery<TFilters> {
  userId: number;
  filters: TFilters;
  page: number;
  limit: number;
  ownerTechnicianId?: number;
}

export interface TicketProjectReadResult<TItem> {
  data: TItem[];
  total: number;
  options: TicketFilterOptions;
}

export abstract class TicketProjectReadRepository {
  abstract listProjects(
    query: TicketProjectReadQuery<TicketProjectFilters>,
  ): Promise<TicketProjectReadResult<TicketProjectListItem>>;

  abstract listTasks(
    query: TicketProjectReadQuery<TicketProjectTaskFilters>,
  ): Promise<TicketProjectReadResult<TicketProjectTaskListItem>>;
}

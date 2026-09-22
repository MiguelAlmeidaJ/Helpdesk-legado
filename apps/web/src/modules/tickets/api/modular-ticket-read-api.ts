import type {
  MarketingTicketDetailResponse,
  MarketingTicketListResponse,
  TicketProjectListItem,
  TicketProjectListResponse,
  TicketProjectTaskListItem,
  TicketProjectTaskListResponse,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export interface SpecializedTicketListQuery {
  page: number;
  limit?: number;
  status?: string;
  clientId?: string;
  technicianId?: string;
  search?: string;
  openedFrom?: string;
  openedTo?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

function append(
  params: URLSearchParams,
  name: string,
  value: string | number | undefined,
) {
  if (value === undefined || value === '') return;
  params.set(name, String(value));
}

function queryString(query: SpecializedTicketListQuery): string {
  const params = new URLSearchParams();
  append(params, 'page', query.page);
  append(params, 'limit', query.limit);
  append(params, 'status', query.status);
  append(params, 'clientId', query.clientId);
  append(params, 'technicianId', query.technicianId);
  append(params, 'search', query.search);
  append(params, 'openedFrom', query.openedFrom);
  append(params, 'openedTo', query.openedTo);
  append(params, 'sort', query.sort);
  append(params, 'direction', query.direction);
  return params.toString();
}

export function fetchDevOpsTickets(
  query: SpecializedTicketListQuery,
  signal?: AbortSignal,
): Promise<TicketProjectTaskListResponse> {
  return apiRequest<TicketProjectTaskListResponse>(
    `tickets/projects/tasks?${queryString(query)}`,
    { signal },
  );
}

export function fetchDevOpsProjects(
  query: SpecializedTicketListQuery,
  signal?: AbortSignal,
): Promise<TicketProjectListResponse> {
  return apiRequest<TicketProjectListResponse>(
    `tickets/projects?${queryString(query)}`,
    { signal },
  );
}

export async function fetchDevOpsProjectDetail(
  projectId: number,
  signal?: AbortSignal,
): Promise<TicketProjectListItem | null> {
  const response = await apiRequest<TicketProjectListResponse>(
    `tickets/projects?page=1&limit=1&status=all&id=${projectId}&sort=id&direction=desc`,
    { signal },
  );
  return response.data[0] ?? null;
}

export function fetchDevOpsProjectTickets(
  projectId: number,
  query: SpecializedTicketListQuery,
  signal?: AbortSignal,
): Promise<TicketProjectTaskListResponse> {
  return apiRequest<TicketProjectTaskListResponse>(
    `tickets/projects/${projectId}/tasks?${queryString(query)}`,
    { signal },
  );
}

export async function fetchDevOpsTicketDetail(
  ticketId: number,
  signal?: AbortSignal,
): Promise<TicketProjectTaskListItem | null> {
  const response = await apiRequest<TicketProjectTaskListResponse>(
    `tickets/projects/tasks?page=1&limit=1&status=all&id=${ticketId}&sort=id&direction=desc`,
    { signal },
  );
  return response.data[0] ?? null;
}

export function fetchMarketingTickets(
  query: SpecializedTicketListQuery,
  signal?: AbortSignal,
): Promise<MarketingTicketListResponse> {
  return apiRequest<MarketingTicketListResponse>(
    `tickets/marketing?${queryString(query)}`,
    { signal },
  );
}

export function fetchMarketingTicketDetail(
  ticketId: number,
  signal?: AbortSignal,
): Promise<MarketingTicketDetailResponse> {
  return apiRequest<MarketingTicketDetailResponse>(
    `tickets/marketing/${ticketId}`,
    { signal },
  );
}

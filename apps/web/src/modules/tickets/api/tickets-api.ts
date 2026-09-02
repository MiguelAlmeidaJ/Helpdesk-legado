import type {
  TicketDetailResponse,
  TicketListResponse,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export interface TicketListQuery {
  page: number;
  limit?: number;
  status?: string;
  clientId?: string;
  requesterId?: string;
  technicianId?: string;
  search?: string;
  openedFrom?: string;
  openedTo?: string;
  sort?: string;
  direction?: string;
}

function append(
  params: URLSearchParams,
  name: string,
  value: string | number | undefined,
) {
  if (value === undefined || value === '') {
    return;
  }

  params.set(name, String(value));
}

export async function fetchTickets(
  query: TicketListQuery,
  signal?: AbortSignal,
): Promise<TicketListResponse> {
  const params = new URLSearchParams();

  append(params, 'page', query.page);
  append(params, 'limit', query.limit);
  append(params, 'status', query.status);
  append(params, 'clientId', query.clientId);
  append(params, 'requesterId', query.requesterId);
  append(params, 'technicianId', query.technicianId);
  append(params, 'search', query.search);
  append(params, 'openedFrom', query.openedFrom);
  append(params, 'openedTo', query.openedTo);
  append(params, 'sort', query.sort);
  append(params, 'direction', query.direction);

  return apiRequest<TicketListResponse>(`tickets?${params.toString()}`, {
    signal,
  });
}

export async function fetchTicketDetail(
  ticketId: number,
  signal?: AbortSignal,
): Promise<TicketDetailResponse> {
  return apiRequest<TicketDetailResponse>(`tickets/${ticketId}`, {
    signal,
  });
}

import type {
  TicketRecurrenceListResponse,
  TicketRecurrenceMutationRequest,
  TicketRecurrenceMutationResponse,
  TicketRecurrenceStatusFilter,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchTicketRecurrences(filters: { clientId?: number; period?: number; status?: TicketRecurrenceStatusFilter }, signal?: AbortSignal): Promise<TicketRecurrenceListResponse> {
  const params = new URLSearchParams();
  if (filters.clientId) params.set('clientId', String(filters.clientId));
  if (filters.period) params.set('period', String(filters.period));
  params.set('status', filters.status ?? 'ativas');
  return apiRequest<TicketRecurrenceListResponse>(`tickets/recurrences?${params.toString()}`, { signal });
}

export function createTicketRecurrence(input: TicketRecurrenceMutationRequest): Promise<TicketRecurrenceMutationResponse> {
  return apiRequest<TicketRecurrenceMutationResponse>('tickets/recurrences', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
}

export async function updateTicketRecurrence(id: number, input: TicketRecurrenceMutationRequest): Promise<void> {
  await apiRequest<null>(`tickets/recurrences/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
}

export async function setTicketRecurrenceActive(id: number, active: boolean): Promise<void> {
  await apiRequest<null>(`tickets/recurrences/${id}/active`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }),
  });
}

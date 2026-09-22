import type {
  TicketSlaSettings,
  UpdateTicketSlaSettingsRequest,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchTicketSlaSettings(
  signal?: AbortSignal,
): Promise<TicketSlaSettings> {
  return apiRequest<TicketSlaSettings>('administration/ticket-sla', { signal });
}

export function updateTicketSlaSettings(
  input: UpdateTicketSlaSettingsRequest,
): Promise<TicketSlaSettings> {
  return apiRequest<TicketSlaSettings>('administration/ticket-sla', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

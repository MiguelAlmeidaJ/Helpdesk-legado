import type {
  SaveTicketSlaRuleRequest,
  TicketSlaPolicyResponse,
  TicketSlaRule,
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


export function fetchTicketSlaPolicy(
  signal?: AbortSignal,
): Promise<TicketSlaPolicyResponse> {
  return apiRequest<TicketSlaPolicyResponse>(
    'administration/ticket-sla/policy',
    { signal },
  );
}

export function createTicketSlaRule(
  input: SaveTicketSlaRuleRequest,
): Promise<TicketSlaRule> {
  return apiRequest<TicketSlaRule>('administration/ticket-sla/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateTicketSlaRule(
  id: number,
  input: SaveTicketSlaRuleRequest,
): Promise<TicketSlaRule> {
  return apiRequest<TicketSlaRule>(`administration/ticket-sla/rules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function deleteTicketSlaRule(id: number): Promise<void> {
  await apiRequest<void>(`administration/ticket-sla/rules/${id}`, {
    method: 'DELETE',
  });
}

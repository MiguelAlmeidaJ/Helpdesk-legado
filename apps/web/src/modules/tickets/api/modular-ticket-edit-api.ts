import type {
  MarketingTicketUpdateRequest,
  TicketProjectTaskUpdateRequest,
  TicketProjectUpdateRequest,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

function patch<T>(path: string, body: T): Promise<void> {
  return apiRequest<null>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(() => undefined);
}

export function updateDevOpsTicketClassification(
  ticketId: number,
  input: TicketProjectTaskUpdateRequest,
): Promise<void> {
  return patch(`tickets/projects/tasks/${ticketId}`, input);
}

export function updateDevOpsProjectClassification(
  projectId: number,
  input: TicketProjectUpdateRequest,
): Promise<void> {
  return patch(`tickets/projects/${projectId}`, input);
}

export function updateMarketingTicketClassification(
  ticketId: number,
  input: MarketingTicketUpdateRequest,
): Promise<void> {
  return patch(`tickets/marketing/${ticketId}/classification`, input);
}

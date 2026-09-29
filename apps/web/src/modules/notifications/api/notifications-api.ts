import type {
  MarkNotificationsReadRequest,
  NotificationCenterResponse,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchNotifications(
  signal?: AbortSignal,
): Promise<NotificationCenterResponse> {
  return apiRequest<NotificationCenterResponse>('notifications', { signal });
}

export async function markNotificationsRead(
  input: MarkNotificationsReadRequest,
): Promise<void> {
  await apiRequest<void>('notifications/read', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

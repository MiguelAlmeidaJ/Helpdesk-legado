import type { AccessManagementSnapshot } from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchAccessManagement(signal?: AbortSignal) {
  return apiRequest<AccessManagementSnapshot>('access-management', { signal });
}

import type { AppNavigationResponse } from '@helpdesk/contracts';
import { apiRequest } from '../api/api-client';

export function fetchAppNavigation(signal?: AbortSignal): Promise<AppNavigationResponse> {
  return apiRequest<AppNavigationResponse>('navigation', { signal });
}

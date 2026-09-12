import type { OperationalDashboardResponse } from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchOperationalDashboard(
  startDate?: string,
  endDate?: string,
): Promise<OperationalDashboardResponse> {
  const query = new URLSearchParams();

  if (startDate) query.set('startDate', startDate);
  if (endDate) query.set('endDate', endDate);

  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiRequest<OperationalDashboardResponse>(`dashboard${suffix}`);
}

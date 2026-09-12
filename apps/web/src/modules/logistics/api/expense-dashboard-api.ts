import type { LogisticsExpenseDashboardResponse } from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function getExpenseDashboard(
  startDate?: string,
  endDate?: string,
): Promise<LogisticsExpenseDashboardResponse> {
  const query = new URLSearchParams();

  if (startDate) query.set('startDate', startDate);
  if (endDate) query.set('endDate', endDate);

  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiRequest<LogisticsExpenseDashboardResponse>(
    `logistics/expenses/dashboard${suffix}`,
  );
}

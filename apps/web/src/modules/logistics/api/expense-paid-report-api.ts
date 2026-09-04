import type { LogisticsExpensePaidReportResponse } from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export interface ExpensePaidReportFilters {
  startDate?: string;
  endDate?: string;
  userId?: number;
  clientName?: string;
  categoryIds?: number[];
}

export function getExpensePaidReport(
  filters: ExpensePaidReportFilters = {},
): Promise<LogisticsExpensePaidReportResponse> {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.userId) params.set('userId', String(filters.userId));
  if (filters.clientName) params.set('clientName', filters.clientName);
  for (const categoryId of filters.categoryIds ?? []) {
    params.append('categoryId', String(categoryId));
  }
  const query = params.toString();
  return apiRequest<LogisticsExpensePaidReportResponse>(
    `logistics/expenses/admin/report${query ? `?${query}` : ''}`,
  );
}

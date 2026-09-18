import type { LogisticsExpenseComparisonResponse } from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export interface ExpenseComparisonFilters {
  period1Start?: string;
  period1End?: string;
  period2Start?: string;
  period2End?: string;
  percentAlert?: number;
}

export function getExpenseComparison(
  filters: ExpenseComparisonFilters = {},
): Promise<LogisticsExpenseComparisonResponse> {
  const params = new URLSearchParams();
  if (filters.period1Start) params.set('period1Start', filters.period1Start);
  if (filters.period1End) params.set('period1End', filters.period1End);
  if (filters.period2Start) params.set('period2Start', filters.period2Start);
  if (filters.period2End) params.set('period2End', filters.period2End);
  const query = params.toString();
  return apiRequest<LogisticsExpenseComparisonResponse>(
    `logistics/expenses/admin/analysis${query ? `?${query}` : ''}`,
  );
}

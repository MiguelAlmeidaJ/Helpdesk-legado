import type { LogisticsExpenseDashboardResponse } from '@helpdesk/contracts';

export interface ExpenseDashboardRepositoryQuery {
  userId: number;
  userName: string;
  startDate?: string;
  endDate?: string;
}

export abstract class ExpenseDashboardRepository {
  abstract get(
    input: ExpenseDashboardRepositoryQuery,
  ): Promise<LogisticsExpenseDashboardResponse>;
}

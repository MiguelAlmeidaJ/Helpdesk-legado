import type { OperationalDashboardResponse } from '@helpdesk/contracts';

export interface DashboardQuery {
  userId: number;
  startDate?: string;
  endDate?: string;
}

export abstract class DashboardRepository {
  abstract get(query: DashboardQuery): Promise<OperationalDashboardResponse>;
}

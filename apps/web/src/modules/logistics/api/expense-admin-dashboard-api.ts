import type {
  LogisticsExpenseAdminDashboardResponse,
  LogisticsExpenseAdminDetailsResponse,
  LogisticsExpenseAdminGroup,
  LogisticsExpenseAdminStatus,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function getExpenseAdminDashboard(
  startDate?: string,
  endDate?: string,
  status: LogisticsExpenseAdminStatus = 4,
): Promise<LogisticsExpenseAdminDashboardResponse> {
  const query = new URLSearchParams();

  if (startDate) query.set('startDate', startDate);
  if (endDate) query.set('endDate', endDate);
  query.set('status', String(status));

  return apiRequest<LogisticsExpenseAdminDashboardResponse>(
    `logistics/expenses/admin/summary?${query.toString()}`,
  );
}

export function getExpenseAdminDetails(input: {
  startDate: string;
  endDate: string;
  status: LogisticsExpenseAdminStatus;
  group: LogisticsExpenseAdminGroup;
  key: string;
}): Promise<LogisticsExpenseAdminDetailsResponse> {
  const query = new URLSearchParams({
    startDate: input.startDate,
    endDate: input.endDate,
    status: String(input.status),
    group: input.group,
    key: input.key,
  });

  return apiRequest<LogisticsExpenseAdminDetailsResponse>(
    `logistics/expenses/admin/details?${query.toString()}`,
  );
}

import type {
  LogisticsExpenseAdminDashboardResponse,
  LogisticsExpenseAdminDetailsResponse,
  LogisticsExpenseAdminGroup,
  LogisticsExpenseAdminStatus,
} from '@helpdesk/contracts';

export abstract class ExpenseAdminDashboardRepository {
  abstract summary(
    startDate: string | undefined,
    endDate: string | undefined,
    status: LogisticsExpenseAdminStatus,
  ): Promise<LogisticsExpenseAdminDashboardResponse>;

  abstract details(input: {
    startDate?: string;
    endDate?: string;
    status: LogisticsExpenseAdminStatus;
    group: LogisticsExpenseAdminGroup;
    key: string;
  }): Promise<LogisticsExpenseAdminDetailsResponse>;
}

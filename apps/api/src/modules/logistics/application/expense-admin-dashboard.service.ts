import { Injectable } from '@nestjs/common';
import type {
  LogisticsExpenseAdminDashboardResponse,
  LogisticsExpenseAdminDetailsResponse,
  LogisticsExpenseAdminGroup,
  LogisticsExpenseAdminStatus,
} from '@helpdesk/contracts';
import { ExpenseAdminDashboardRepository } from '../infrastructure/expense-admin-dashboard.repository';

@Injectable()
export class ExpenseAdminDashboardService {
  constructor(private readonly repository: ExpenseAdminDashboardRepository) {}

  summary(
    startDate: string | undefined,
    endDate: string | undefined,
    status: LogisticsExpenseAdminStatus,
  ): Promise<LogisticsExpenseAdminDashboardResponse> {
    return this.repository.summary(startDate, endDate, status);
  }

  details(input: {
    startDate?: string;
    endDate?: string;
    status: LogisticsExpenseAdminStatus;
    group: LogisticsExpenseAdminGroup;
    key: string;
  }): Promise<LogisticsExpenseAdminDetailsResponse> {
    return this.repository.details(input);
  }
}

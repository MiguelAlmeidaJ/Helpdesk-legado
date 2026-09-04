import { Injectable } from '@nestjs/common';
import type { LogisticsExpenseDashboardResponse } from '@helpdesk/contracts';
import { ExpenseDashboardRepository } from '../infrastructure/expense-dashboard.repository';

@Injectable()
export class ExpenseDashboardService {
  constructor(private readonly repository: ExpenseDashboardRepository) {}

  get(input: {
    userId: number;
    userName: string;
    startDate?: string;
    endDate?: string;
  }): Promise<LogisticsExpenseDashboardResponse> {
    return this.repository.get(input);
  }
}

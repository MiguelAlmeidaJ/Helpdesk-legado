import { Injectable } from '@nestjs/common';
import type {
  LogisticsExpensePaidReportResponse,
  PermissionScope,
} from '@helpdesk/contracts';
import { ExpensePaidReportRepository } from '../infrastructure/expense-paid-report.repository';

export interface ExpensePaidReportQuery {
  startDate?: string;
  endDate?: string;
  actorUserId: number;
  scope: PermissionScope;
  userId?: number;
  clientName?: string;
  categoryIds: number[];
}

@Injectable()
export class ExpensePaidReportService {
  constructor(private readonly repository: ExpensePaidReportRepository) {}

  report(input: ExpensePaidReportQuery): Promise<LogisticsExpensePaidReportResponse> {
    return this.repository.report(input);
  }
}

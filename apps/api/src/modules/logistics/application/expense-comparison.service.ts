import { Injectable } from '@nestjs/common';
import type {
  LogisticsExpenseComparisonResponse,
  PermissionScope,
} from '@helpdesk/contracts';
import { ExpenseComparisonRepository } from '../infrastructure/expense-comparison.repository';

export interface ExpenseComparisonQuery {
  period1Start?: string;
  period1End?: string;
  period2Start?: string;
  period2End?: string;
  actorUserId: number;
  scope: PermissionScope;
}

@Injectable()
export class ExpenseComparisonService {
  constructor(private readonly repository: ExpenseComparisonRepository) {}

  compare(
    input: ExpenseComparisonQuery,
  ): Promise<LogisticsExpenseComparisonResponse> {
    return this.repository.compare(input);
  }
}

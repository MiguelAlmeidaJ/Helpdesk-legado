import type {
  LogisticsExpenseComparisonResponse,
  PermissionScope,
} from '@helpdesk/contracts';

export interface ExpenseComparisonRepositoryQuery {
  period1Start?: string;
  period1End?: string;
  period2Start?: string;
  period2End?: string;
  actorUserId: number;
  scope: PermissionScope;
}

export abstract class ExpenseComparisonRepository {
  abstract compare(
    input: ExpenseComparisonRepositoryQuery,
  ): Promise<LogisticsExpenseComparisonResponse>;
}

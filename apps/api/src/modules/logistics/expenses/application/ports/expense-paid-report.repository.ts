import type {
  LogisticsExpensePaidAdminEditResponse,
  LogisticsExpensePaidReportResponse,
  PermissionScope,
  UpdateLogisticsExpensePaidAdminRequest,
} from '@helpdesk/contracts';

export interface ExpensePaidReportRepositoryQuery {
  startDate?: string;
  endDate?: string;
  actorUserId: number;
  scope: PermissionScope;
  userId?: number;
  clientName?: string;
  categoryIds: number[];
}

export abstract class ExpensePaidReportRepository {
  abstract report(
    input: ExpensePaidReportRepositoryQuery,
  ): Promise<LogisticsExpensePaidReportResponse>;

  abstract edit(
    expenseId: number,
  ): Promise<LogisticsExpensePaidAdminEditResponse | 'not-found' | 'locked'>;

  abstract update(
    expenseId: number,
    request: UpdateLogisticsExpensePaidAdminRequest,
  ): Promise<
    | 'updated'
    | 'not-found'
    | 'locked'
    | 'invalid-category'
    | 'invalid-client'
    | 'invalid-pix-type'
  >;
}

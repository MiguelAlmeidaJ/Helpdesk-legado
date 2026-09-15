import type { LogisticsExpensePaymentQueueResponse } from '@helpdesk/contracts';

export type ExpensePaymentMutationResult =
  | { kind: 'paid'; ids: number[] }
  | { kind: 'rejected'; ids: number[] }
  | { kind: 'not-found'; ids: number[] }
  | { kind: 'not-approved'; ids: number[] };

export abstract class ExpensePaymentRepository {
  abstract queue(): Promise<LogisticsExpensePaymentQueueResponse>;

  abstract pay(
    payerId: number,
    expenseId: number,
    remarks: string,
  ): Promise<ExpensePaymentMutationResult>;

  abstract reject(
    payerId: number,
    expenseId: number,
    remarks: string,
  ): Promise<ExpensePaymentMutationResult>;

  abstract payBatch(
    payerId: number,
    entries: Array<{ id: number; remarks: string }>,
  ): Promise<ExpensePaymentMutationResult>;
}

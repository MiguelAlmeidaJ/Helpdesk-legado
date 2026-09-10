import type {
  LogisticsExpenseApprovalItem,
  LogisticsExpenseApprovalQueueResponse,
} from '@helpdesk/contracts';

export interface ExpenseApprovalAttachmentContent {
  name: string;
  mimeType: string;
  data: Buffer;
}

export type ExpenseApprovalMutationResult =
  | { kind: 'approved'; items: LogisticsExpenseApprovalItem[] }
  | { kind: 'rejected'; ids: number[] }
  | { kind: 'not-found'; ids: number[] }
  | { kind: 'not-pending'; ids: number[] };

export abstract class ExpenseApprovalRepository {
  abstract queue(): Promise<LogisticsExpenseApprovalQueueResponse>;

  abstract attachmentContent(
    expenseId: number,
    attachmentKey: string,
  ): Promise<ExpenseApprovalAttachmentContent | null>;

  abstract approve(
    approverId: number,
    expenseId: number,
    remarks: string,
  ): Promise<ExpenseApprovalMutationResult>;

  abstract approveBatch(
    approverId: number,
    entries: Array<{ id: number; remarks: string }>,
  ): Promise<ExpenseApprovalMutationResult>;

  abstract reject(expenseId: number): Promise<ExpenseApprovalMutationResult>;
}

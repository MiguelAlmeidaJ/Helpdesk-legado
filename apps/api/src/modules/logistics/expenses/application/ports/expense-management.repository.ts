import type {
  CreateLogisticsExpenseRequest,
  LogisticsExpenseAttachment,
  LogisticsExpenseManagementResponse,
  UpdateLogisticsExpenseRequest,
} from '@helpdesk/contracts';

export interface ExpenseAttachmentContent {
  name: string;
  mimeType: string;
  data: Buffer;
}

export interface UploadExpenseAttachmentInput {
  userId: number;
  userName: string;
  expenseId: number;
  originalName: string;
  mimeType: string;
  data: Buffer;
}

export abstract class ExpenseManagementRepository {
  abstract get(
    userId: number,
    startDate: string,
    endDate: string,
  ): Promise<LogisticsExpenseManagementResponse | null>;

  abstract create(
    userId: number,
    request: CreateLogisticsExpenseRequest,
  ): Promise<number | null>;

  abstract update(
    userId: number,
    id: number,
    request: UpdateLogisticsExpenseRequest,
  ): Promise<'updated' | 'not-found' | 'locked' | 'invalid-catalog'>;

  abstract delete(
    userId: number,
    id: number,
  ): Promise<'deleted' | 'not-found' | 'locked'>;

  abstract uploadAttachment(
    input: UploadExpenseAttachmentInput,
  ): Promise<LogisticsExpenseAttachment | 'not-found' | 'locked'>;

  abstract deleteAttachment(
    userId: number,
    expenseId: number,
    key: string,
  ): Promise<'deleted' | 'not-found' | 'locked'>;

  abstract attachmentContent(
    userId: number,
    expenseId: number,
    key: string,
  ): Promise<ExpenseAttachmentContent | null>;
}

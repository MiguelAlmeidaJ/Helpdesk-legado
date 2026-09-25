export interface LogisticsExpenseApprovalAttachment {
  key: string;
  name: string;
  native: boolean;
}

export interface LogisticsExpenseApprovalItem {
  id: number;
  createdAt: string;
  categoryId: number;
  categoryName: string;
  clientName: string;
  userId: number;
  userName: string;
  amount: number;
  remarks: string;
  pix: string;
  pixTypeId: number | null;
  pixTypeName: string;
  attachments: LogisticsExpenseApprovalAttachment[];
  receiptRequiredMissing: boolean;
}

export interface LogisticsExpenseApprovalQueueResponse {
  count: number;
  totalAmount: number;
  items: LogisticsExpenseApprovalItem[];
}

export interface LogisticsExpenseApprovalRequest {
  remarks?: string;
}

export interface LogisticsExpenseBatchApprovalEntry {
  id: number;
  remarks?: string;
}

export interface LogisticsExpenseBatchApprovalRequest {
  items: LogisticsExpenseBatchApprovalEntry[];
}

export interface LogisticsExpenseApprovalActionResponse {
  ids: number[];
}

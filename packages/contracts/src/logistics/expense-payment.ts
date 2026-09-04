export interface LogisticsExpensePaymentItem {
  id: number;
  createdAt: string;
  categoryName: string;
  clientName: string;
  userId: number;
  userName: string;
  amount: number;
  userRemarks: string;
  approvalRemarks: string;
  pix: string;
  pixTypeId: number | null;
  pixTypeName: string;
}

export interface LogisticsExpensePaymentGroup {
  key: string;
  userId: number;
  userName: string;
  pix: string;
  pixTypeId: number | null;
  pixTypeName: string;
  totalAmount: number;
  itemCount: number;
  descriptionPreview: string;
  items: LogisticsExpensePaymentItem[];
}

export interface LogisticsExpensePaymentQueueResponse {
  count: number;
  totalAmount: number;
  groups: LogisticsExpensePaymentGroup[];
}

export interface LogisticsExpensePaymentRequest {
  remarks?: string;
}

export interface LogisticsExpenseBatchPaymentRequest {
  items: Array<{
    id: number;
    remarks?: string;
  }>;
}

export interface LogisticsExpensePaymentActionResponse {
  ids: number[];
}

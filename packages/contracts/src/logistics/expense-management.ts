export type LogisticsExpenseStatus = 1 | 2 | 3 | 4;

export interface LogisticsExpenseOption {
  id: number;
  name: string;
}

export interface LogisticsExpenseAttachment {
  key: string;
  name: string;
  contentUrl: string;
  native: boolean;
}

export interface LogisticsExpenseItem {
  id: number;
  remarks: string;
  clientId: number | null;
  clientName: string;
  amount: number;
  categoryId: number;
  categoryName: string;
  createdAt: string;
  status: LogisticsExpenseStatus;
  pixTypeId: number | null;
  pix: string;
  attachments: LogisticsExpenseAttachment[];
  canEdit: boolean;
}

export interface LogisticsExpenseManagementResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  profile: {
    userId: number;
    userName: string;
    pixTypeId: number | null;
    pix: string;
  };
  categories: LogisticsExpenseOption[];
  clients: LogisticsExpenseOption[];
  pixTypes: LogisticsExpenseOption[];
  expenses: LogisticsExpenseItem[];
}

export interface CreateLogisticsExpenseRequest {
  amount: number;
  categoryId: number;
  clientId: number;
  pixTypeId: number;
  pix?: string;
  remarks?: string;
}

export interface UpdateLogisticsExpenseRequest
  extends CreateLogisticsExpenseRequest {}

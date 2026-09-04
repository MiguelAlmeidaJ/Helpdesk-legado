import type { PermissionScope } from '../auth/permission-scope';

export interface LogisticsExpensePaidReportFilterOption {
  value: string;
  label: string;
}

export interface LogisticsExpensePaidReportItem {
  id: number;
  createdAt: string;
  paidAt: string;
  userId: number;
  userName: string;
  categoryId: number | null;
  categoryName: string;
  clientId: number | null;
  clientName: string;
  remarks: string;
  amount: number;
}

export interface LogisticsExpensePaidReportResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  scope: PermissionScope;
  filters: {
    userId: number | null;
    clientName: string;
    categoryIds: number[];
  };
  options: {
    collaborators: LogisticsExpensePaidReportFilterOption[];
    clients: LogisticsExpensePaidReportFilterOption[];
    categories: LogisticsExpensePaidReportFilterOption[];
  };
  count: number;
  totalAmount: number;
  items: LogisticsExpensePaidReportItem[];
}

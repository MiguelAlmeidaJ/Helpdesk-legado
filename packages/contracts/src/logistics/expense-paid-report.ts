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

export type LogisticsExpensePaidCategoryCatalog = 'legacy' | 'current';

export interface LogisticsExpensePaidAdminEditExpense {
  id: number;
  paidAt: string;
  userId: number;
  userName: string;
  amount: number;
  categoryId: number | null;
  categoryName: string;
  categoryCatalog: LogisticsExpensePaidCategoryCatalog;
  clientId: number | null;
  clientName: string;
  pixTypeId: number | null;
  pixTypeName: string;
  pix: string;
  remarks: string;
}

export interface LogisticsExpensePaidAdminEditResponse {
  expense: LogisticsExpensePaidAdminEditExpense;
  options: {
    categories: LogisticsExpensePaidReportFilterOption[];
    clients: LogisticsExpensePaidReportFilterOption[];
    pixTypes: LogisticsExpensePaidReportFilterOption[];
  };
}

export interface UpdateLogisticsExpensePaidAdminRequest {
  amount: number;
  categoryId: number;
  clientId: number | null;
  pixTypeId: number | null;
  pix: string;
  remarks: string;
}

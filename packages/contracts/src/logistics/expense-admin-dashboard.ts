export type LogisticsExpenseAdminStatus = 1 | 2 | 4;

export type LogisticsExpenseAdminGroup =
  | 'category'
  | 'client'
  | 'collaborator';

export interface LogisticsExpenseAdminBreakdownItem {
  key: string;
  label: string;
  amount: number;
}

export interface LogisticsExpenseAdminDashboardResponse {
  period: {
    startDate: string;
    endDate: string;
    status: LogisticsExpenseAdminStatus;
  };
  totals: {
    globalPending: number;
    globalApproved: number;
    globalApprovedCount: number;
    periodPending: number;
    periodApproved: number;
    periodPaid: number;
    periodPendingCount: number;
    periodApprovedCount: number;
  };
  categories: LogisticsExpenseAdminBreakdownItem[];
  clients: LogisticsExpenseAdminBreakdownItem[];
  collaborators: LogisticsExpenseAdminBreakdownItem[];
}

export interface LogisticsExpenseAdminDetailItem {
  id: number;
  createdAt: string;
  userName: string;
  description: string;
  amount: number;
}

export interface LogisticsExpenseAdminDetailsResponse {
  filter: {
    startDate: string;
    endDate: string;
    status: LogisticsExpenseAdminStatus;
    group: LogisticsExpenseAdminGroup;
    key: string;
  };
  total: number;
  items: LogisticsExpenseAdminDetailItem[];
}

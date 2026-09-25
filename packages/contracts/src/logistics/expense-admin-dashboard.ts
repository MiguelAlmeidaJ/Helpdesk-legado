export type LogisticsExpenseAdminStatus = 1 | 2 | 4;

export type LogisticsExpenseAdminGroup =
  | 'category'
  | 'group'
  | 'subgroup'
  | 'client'
  | 'collaborator';

export interface LogisticsExpenseAdminBreakdownItem {
  key: string;
  label: string;
  amount: number;
  count: number;
}

export interface LogisticsExpenseAdminTimelineItem {
  date: string;
  amount: number;
  count: number;
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
    periodPaidCount: number;
  };
  groups: LogisticsExpenseAdminBreakdownItem[];
  subgroups: LogisticsExpenseAdminBreakdownItem[];
  categories: LogisticsExpenseAdminBreakdownItem[];
  clients: LogisticsExpenseAdminBreakdownItem[];
  collaborators: LogisticsExpenseAdminBreakdownItem[];
  timeline: LogisticsExpenseAdminTimelineItem[];
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

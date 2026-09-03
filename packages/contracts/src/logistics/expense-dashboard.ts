export interface LogisticsExpenseDashboardPeriod {
  startDate: string;
  endDate: string;
  label: string;
}

export interface LogisticsExpenseDashboardTotals {
  awaitingApproval: number;
  approvedForPayment: number;
  receivedInPeriod: number;
}

export interface LogisticsExpenseDashboardItem {
  id: number;
  clientName: string;
  date: string;
  categoryName: string;
  amount: number;
}

export interface LogisticsExpenseDashboardResponse {
  generatedAt: string;
  userName: string;
  period: LogisticsExpenseDashboardPeriod;
  totals: LogisticsExpenseDashboardTotals;
  latestReceived: LogisticsExpenseDashboardItem[];
}

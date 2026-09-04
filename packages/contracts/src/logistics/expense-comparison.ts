import type { PermissionScope } from '../auth/permission-scope';

export interface LogisticsExpenseComparisonPeriod {
  startDate: string;
  endDate: string;
}

export interface LogisticsExpenseComparisonGroup {
  label: string;
  period1Amount: number;
  period2Amount: number;
  difference: number;
  variationPercent: number;
}

export interface LogisticsExpenseComparisonResponse {
  scope: PermissionScope;
  periods: {
    period1: LogisticsExpenseComparisonPeriod;
    period2: LogisticsExpenseComparisonPeriod;
  };
  totals: {
    period1Amount: number;
    period2Amount: number;
    difference: number;
    variationPercent: number;
  };
  categories: LogisticsExpenseComparisonGroup[];
  clients: LogisticsExpenseComparisonGroup[];
}

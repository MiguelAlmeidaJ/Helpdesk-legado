export type TicketCategoryTotalsLevel = 0 | 1 | 2 | 3;

export interface TicketCategoryTotalsReportRow {
  categoryId: number;
  categoryName: string;
  level1: number;
  level2: number;
  level3: number;
  total: number;
}

export interface TicketCategoryTotalsReportResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  level: TicketCategoryTotalsLevel;
  total: number;
  rows: TicketCategoryTotalsReportRow[];
}

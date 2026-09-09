export type TicketClientTotalsLevel = 0 | 1 | 2 | 3;

export interface TicketClientTotalsReportRow {
  clientId: number;
  clientName: string;
  level1: number;
  level2: number;
  level3: number;
  total: number;
}

export interface TicketClientTotalsReportResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  level: TicketClientTotalsLevel;
  total: number;
  rows: TicketClientTotalsReportRow[];
}

export type TicketBreakdownLevel = 0 | 1 | 2 | 3;
export type TicketBreakdownMode =
  | 'client-daily'
  | 'requester'
  | 'technician-daily';

export interface TicketBreakdownReportRow {
  key: string;
  label: string;
  date: string | null;
  level1: number;
  level2: number;
  level3: number;
  total: number;
}

export interface TicketBreakdownReportResponse {
  mode: TicketBreakdownMode;
  period: {
    startDate: string;
    endDate: string;
  };
  level: TicketBreakdownLevel;
  total: number;
  rows: TicketBreakdownReportRow[];
}

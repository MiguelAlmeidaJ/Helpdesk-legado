export type TicketTechnicianTotalsLevel = 0 | 1 | 2 | 3;

export interface TicketTechnicianTotalsReportRow {
  technicianId: number;
  technicianName: string;
  level1: number;
  level2: number;
  level3: number;
  total: number;
}

export interface TicketTechnicianTotalsReportResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  level: TicketTechnicianTotalsLevel;
  total: number;
  rows: TicketTechnicianTotalsReportRow[];
}

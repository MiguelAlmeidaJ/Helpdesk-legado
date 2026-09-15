import type {
  TicketTechnicianTotalsLevel,
  TicketTechnicianTotalsReportResponse,
} from '@helpdesk/contracts';

export interface TicketTechnicianTotalsReportQuery {
  userId: number;
  startDate: string;
  endDate: string;
  level: TicketTechnicianTotalsLevel;
}

export abstract class TicketTechnicianTotalsReportRepository {
  abstract get(
    query: TicketTechnicianTotalsReportQuery,
  ): Promise<TicketTechnicianTotalsReportResponse>;
}

import type {
  TicketTechnicianTotalsLevel,
  TicketTechnicianTotalsReportResponse,
} from '@helpdesk/contracts';

export interface TicketTechnicianTotalsReportQuery {
  userId: number;
  startDate: string;
  endDate: string;
  clientId: number;
  technicianId: number;
  categoryId: number;
  status: number;
  level: TicketTechnicianTotalsLevel;
}

export abstract class TicketTechnicianTotalsReportRepository {
  abstract get(
    query: TicketTechnicianTotalsReportQuery,
  ): Promise<TicketTechnicianTotalsReportResponse>;
}

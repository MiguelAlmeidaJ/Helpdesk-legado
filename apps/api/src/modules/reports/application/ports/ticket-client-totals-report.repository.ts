import type {
  TicketClientTotalsLevel,
  TicketClientTotalsReportResponse,
} from '@helpdesk/contracts';

export interface TicketClientTotalsReportQuery {
  userId: number;
  startDate: string;
  endDate: string;
  clientId: number;
  technicianId: number;
  categoryId: number;
  status: number;
  level: TicketClientTotalsLevel;
}

export abstract class TicketClientTotalsReportRepository {
  abstract get(
    query: TicketClientTotalsReportQuery,
  ): Promise<TicketClientTotalsReportResponse>;
}

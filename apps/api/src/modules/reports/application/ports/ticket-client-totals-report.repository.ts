import type {
  TicketClientTotalsLevel,
  TicketClientTotalsReportResponse,
} from '@helpdesk/contracts';

export interface TicketClientTotalsReportQuery {
  userId: number;
  startDate: string;
  endDate: string;
  level: TicketClientTotalsLevel;
}

export abstract class TicketClientTotalsReportRepository {
  abstract get(
    query: TicketClientTotalsReportQuery,
  ): Promise<TicketClientTotalsReportResponse>;
}

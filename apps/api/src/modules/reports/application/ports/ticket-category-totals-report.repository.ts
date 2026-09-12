import type {
  TicketCategoryTotalsLevel,
  TicketCategoryTotalsReportResponse,
} from '@helpdesk/contracts';

export interface TicketCategoryTotalsReportQuery {
  userId: number;
  startDate: string;
  endDate: string;
  level: TicketCategoryTotalsLevel;
}

export abstract class TicketCategoryTotalsReportRepository {
  abstract get(
    query: TicketCategoryTotalsReportQuery,
  ): Promise<TicketCategoryTotalsReportResponse>;
}

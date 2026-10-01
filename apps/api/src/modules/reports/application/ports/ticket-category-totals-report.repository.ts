import type {
  TicketCategoryTotalsLevel,
  TicketCategoryTotalsReportResponse,
} from '@helpdesk/contracts';

export interface TicketCategoryTotalsReportQuery {
  userId: number;
  startDate: string;
  endDate: string;
  clientId: number;
  clientIds: number[];
  technicianId: number;
  categoryId: number;
  status: number;
  level: TicketCategoryTotalsLevel;
}

export abstract class TicketCategoryTotalsReportRepository {
  abstract get(
    query: TicketCategoryTotalsReportQuery,
  ): Promise<TicketCategoryTotalsReportResponse>;
}

import type { ReportSector } from '@helpdesk/contracts';
import type {
  TicketTechnicianTotalsLevel,
  TicketTechnicianTotalsReportResponse,
} from '@helpdesk/contracts';

export interface TicketTechnicianTotalsReportQuery {
  userId: number;
  startDate: string;
  endDate: string;
  clientId: number;
  clientIds: number[];
  technicianId: number;
  sector?: ReportSector;
  categoryId: number;
  status: number;
  level: TicketTechnicianTotalsLevel;
}

export abstract class TicketTechnicianTotalsReportRepository {
  abstract get(
    query: TicketTechnicianTotalsReportQuery,
  ): Promise<TicketTechnicianTotalsReportResponse>;
}

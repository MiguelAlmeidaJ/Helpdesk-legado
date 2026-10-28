import type { ReportSector } from '@helpdesk/contracts';
import { Injectable } from '@nestjs/common';
import type {
  TicketClientTotalsLevel,
  TicketClientTotalsReportResponse,
} from '@helpdesk/contracts';
import { TicketClientTotalsReportRepository } from './ports/ticket-client-totals-report.repository';

export interface GetTicketClientTotalsReportInput {
  userId: number;
  startDate: string;
  endDate: string;
  clientId: number;
  clientIds: number[];
  technicianId: number;
  sector?: ReportSector;
  categoryId: number;
  status: number;
  level: TicketClientTotalsLevel;
}

@Injectable()
export class GetTicketClientTotalsReport {
  constructor(
    private readonly repository: TicketClientTotalsReportRepository,
  ) {}

  execute(
    input: GetTicketClientTotalsReportInput,
  ): Promise<TicketClientTotalsReportResponse> {
    return this.repository.get(input);
  }
}

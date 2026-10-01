import { Injectable } from '@nestjs/common';
import type {
  TicketTechnicianTotalsLevel,
  TicketTechnicianTotalsReportResponse,
} from '@helpdesk/contracts';
import { TicketTechnicianTotalsReportRepository } from './ports/ticket-technician-totals-report.repository';

export interface GetTicketTechnicianTotalsReportInput {
  userId: number;
  startDate: string;
  endDate: string;
  clientId: number;
  clientIds: number[];
  technicianId: number;
  categoryId: number;
  status: number;
  level: TicketTechnicianTotalsLevel;
}

@Injectable()
export class GetTicketTechnicianTotalsReport {
  constructor(
    private readonly repository: TicketTechnicianTotalsReportRepository,
  ) {}

  execute(
    input: GetTicketTechnicianTotalsReportInput,
  ): Promise<TicketTechnicianTotalsReportResponse> {
    return this.repository.get(input);
  }
}

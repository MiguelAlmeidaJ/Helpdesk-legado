import { Injectable } from '@nestjs/common';
import type {
  TicketCategoryTotalsLevel,
  TicketCategoryTotalsReportResponse,
} from '@helpdesk/contracts';
import { TicketCategoryTotalsReportRepository } from './ports/ticket-category-totals-report.repository';

export interface GetTicketCategoryTotalsReportInput {
  userId: number;
  startDate: string;
  endDate: string;
  level: TicketCategoryTotalsLevel;
}

@Injectable()
export class GetTicketCategoryTotalsReport {
  constructor(
    private readonly repository: TicketCategoryTotalsReportRepository,
  ) {}

  execute(
    input: GetTicketCategoryTotalsReportInput,
  ): Promise<TicketCategoryTotalsReportResponse> {
    return this.repository.get(input);
  }
}

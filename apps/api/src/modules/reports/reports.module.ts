import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { GetTicketClientTotalsReport } from './application/get-ticket-client-totals-report';
import { TicketClientTotalsReportRepository } from './application/ports/ticket-client-totals-report.repository';
import { PrismaTicketClientTotalsReportRepository } from './infrastructure/prisma-ticket-client-totals-report.repository';
import { ReportsController } from './presentation/http/reports.controller';

@Module({
  imports: [AccessModule],
  controllers: [ReportsController],
  providers: [
    GetTicketClientTotalsReport,
    {
      provide: TicketClientTotalsReportRepository,
      useClass: PrismaTicketClientTotalsReportRepository,
    },
  ],
})
export class ReportsModule {}

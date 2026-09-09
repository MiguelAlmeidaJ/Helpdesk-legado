import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { GetTicketClientTotalsReport } from './application/get-ticket-client-totals-report';
import { GetTicketTechnicianTotalsReport } from './application/get-ticket-technician-totals-report';
import { TicketClientTotalsReportRepository } from './application/ports/ticket-client-totals-report.repository';
import { TicketTechnicianTotalsReportRepository } from './application/ports/ticket-technician-totals-report.repository';
import { PrismaTicketClientTotalsReportRepository } from './infrastructure/prisma-ticket-client-totals-report.repository';
import { PrismaTicketTechnicianTotalsReportRepository } from './infrastructure/prisma-ticket-technician-totals-report.repository';
import { ReportsController } from './presentation/http/reports.controller';

@Module({
  imports: [AccessModule],
  controllers: [ReportsController],
  providers: [
    GetTicketClientTotalsReport,
    GetTicketTechnicianTotalsReport,
    {
      provide: TicketClientTotalsReportRepository,
      useClass: PrismaTicketClientTotalsReportRepository,
    },
    {
      provide: TicketTechnicianTotalsReportRepository,
      useClass: PrismaTicketTechnicianTotalsReportRepository,
    },
  ],
})
export class ReportsModule {}

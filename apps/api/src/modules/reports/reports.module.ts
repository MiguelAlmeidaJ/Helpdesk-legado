import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { GetTicketAnalytics } from './application/get-ticket-analytics';
import { TicketAnalyticsRepository } from './application/ports/ticket-analytics.repository';
import { PrismaTicketAnalyticsRepository } from './infrastructure/prisma-ticket-analytics.repository';
import { TicketAnalyticsController } from './presentation/http/ticket-analytics.controller';
import { GeneratedReportStorage } from './application/ports/generated-report-storage';
import { LocalGeneratedReportStorage } from './infrastructure/storage/local-generated-report-storage';
import { ReportArchiveController } from './presentation/http/report-archive.controller';
import { GetTicketCategoryTotalsReport } from './application/get-ticket-category-totals-report';
import { GetTicketClientTotalsReport } from './application/get-ticket-client-totals-report';
import { GetTicketTechnicianTotalsReport } from './application/get-ticket-technician-totals-report';
import { TicketCategoryTotalsReportRepository } from './application/ports/ticket-category-totals-report.repository';
import { TicketClientTotalsReportRepository } from './application/ports/ticket-client-totals-report.repository';
import { TicketTechnicianTotalsReportRepository } from './application/ports/ticket-technician-totals-report.repository';
import { PrismaTicketCategoryTotalsReportRepository } from './infrastructure/prisma-ticket-category-totals-report.repository';
import { PrismaTicketClientTotalsReportRepository } from './infrastructure/prisma-ticket-client-totals-report.repository';
import { PrismaTicketTechnicianTotalsReportRepository } from './infrastructure/prisma-ticket-technician-totals-report.repository';
import { ReportsController } from './presentation/http/reports.controller';

@Module({
  imports: [AccessModule],
  controllers: [ReportsController, TicketAnalyticsController, ReportArchiveController],
  providers: [
    GetTicketAnalytics,
    { provide: GeneratedReportStorage, useClass: LocalGeneratedReportStorage },
    { provide: TicketAnalyticsRepository, useClass: PrismaTicketAnalyticsRepository },
    GetTicketCategoryTotalsReport,
    GetTicketClientTotalsReport,
    GetTicketTechnicianTotalsReport,
    {
      provide: TicketCategoryTotalsReportRepository,
      useClass: PrismaTicketCategoryTotalsReportRepository,
    },
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

import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { ExpenseAdminDashboardService } from './application/expense-admin-dashboard.service';
import { ExpenseApprovalService } from './application/expense-approval.service';
import { ExpenseComparisonService } from './application/expense-comparison.service';
import { ExpenseDashboardService } from './application/expense-dashboard.service';
import { ExpenseManagementService } from './application/expense-management.service';
import { ExpensePaymentService } from './application/expense-payment.service';
import { ExpensePaidReportService } from './application/expense-paid-report.service';
import { ExpenseAdminDashboardRepository } from './application/ports/expense-admin-dashboard.repository';
import { ExpenseApprovalNotifier } from './application/ports/expense-approval.notifier';
import { ExpenseApprovalRepository } from './application/ports/expense-approval.repository';
import { ExpenseComparisonRepository } from './application/ports/expense-comparison.repository';
import { ExpenseDashboardRepository } from './application/ports/expense-dashboard.repository';
import { ExpenseManagementRepository } from './application/ports/expense-management.repository';
import { ExpensePaidReportRepository } from './application/ports/expense-paid-report.repository';
import { ExpensePaymentRepository } from './application/ports/expense-payment.repository';
import { VehicleAgendaRepository } from './application/ports/vehicle-agenda.repository';
import { VehicleAgendaService } from './application/vehicle-agenda.service';
import { ExpenseAdminDashboardRepository as ExpenseAdminDashboardRepositoryImpl } from './infrastructure/expense-admin-dashboard.repository';
import { ExpenseApprovalMailer } from './infrastructure/expense-approval.mailer';
import { ExpenseApprovalRepository as ExpenseApprovalRepositoryImpl } from './infrastructure/expense-approval.repository';
import { ExpenseComparisonRepository as ExpenseComparisonRepositoryImpl } from './infrastructure/expense-comparison.repository';
import { ExpenseDashboardRepository as ExpenseDashboardRepositoryImpl } from './infrastructure/expense-dashboard.repository';
import { ExpenseManagementRepository as ExpenseManagementRepositoryImpl } from './infrastructure/expense-management.repository';
import { ExpensePaymentRepository as ExpensePaymentRepositoryImpl } from './infrastructure/expense-payment.repository';
import { ExpensePaidReportRepository as ExpensePaidReportRepositoryImpl } from './infrastructure/expense-paid-report.repository';
import { VehicleAgendaRepository as VehicleAgendaRepositoryImpl } from './infrastructure/vehicle-agenda.repository';
import { ExpenseAdminDashboardController } from './presentation/http/expense-admin-dashboard.controller';
import { ExpenseApprovalController } from './presentation/http/expense-approval.controller';
import { ExpenseComparisonController } from './presentation/http/expense-comparison.controller';
import { ExpenseDashboardController } from './presentation/http/expense-dashboard.controller';
import { ExpenseManagementController } from './presentation/http/expense-management.controller';
import { ExpensePaymentController } from './presentation/http/expense-payment.controller';
import { ExpensePaidReportController } from './presentation/http/expense-paid-report.controller';
import { VehicleAgendaController } from './presentation/http/vehicle-agenda.controller';

@Module({
  imports: [AccessModule],
  controllers: [
    ExpenseAdminDashboardController,
    ExpenseApprovalController,
    ExpenseComparisonController,
    ExpenseDashboardController,
    ExpenseManagementController,
    ExpensePaymentController,
    ExpensePaidReportController,
    VehicleAgendaController,
  ],
  providers: [
    {
      provide: ExpenseAdminDashboardRepository,
      useClass: ExpenseAdminDashboardRepositoryImpl,
    },
    ExpenseAdminDashboardService,
    {
      provide: ExpenseApprovalRepository,
      useClass: ExpenseApprovalRepositoryImpl,
    },
    {
      provide: ExpenseApprovalNotifier,
      useClass: ExpenseApprovalMailer,
    },
    ExpenseApprovalService,
    {
      provide: ExpenseComparisonRepository,
      useClass: ExpenseComparisonRepositoryImpl,
    },
    ExpenseComparisonService,
    {
      provide: ExpenseDashboardRepository,
      useClass: ExpenseDashboardRepositoryImpl,
    },
    ExpenseDashboardService,
    {
      provide: ExpenseManagementRepository,
      useClass: ExpenseManagementRepositoryImpl,
    },
    ExpenseManagementService,
    {
      provide: ExpensePaymentRepository,
      useClass: ExpensePaymentRepositoryImpl,
    },
    ExpensePaymentService,
    {
      provide: ExpensePaidReportRepository,
      useClass: ExpensePaidReportRepositoryImpl,
    },
    ExpensePaidReportService,
    {
      provide: VehicleAgendaRepository,
      useClass: VehicleAgendaRepositoryImpl,
    },
    VehicleAgendaService,
  ],
})
export class LogisticsModule {}

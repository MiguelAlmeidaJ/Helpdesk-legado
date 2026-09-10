import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { ExpenseAdminDashboardService } from './expenses/application/expense-admin-dashboard.service';
import { ExpenseApprovalService } from './expenses/application/expense-approval.service';
import { ExpenseComparisonService } from './expenses/application/expense-comparison.service';
import { ExpenseDashboardService } from './expenses/application/expense-dashboard.service';
import { ExpenseManagementService } from './expenses/application/expense-management.service';
import { ExpensePaymentService } from './expenses/application/expense-payment.service';
import { ExpensePaidReportService } from './expenses/application/expense-paid-report.service';
import { ExpenseAdminDashboardRepository } from './expenses/application/ports/expense-admin-dashboard.repository';
import { ExpenseAttachmentStorage } from './expenses/application/ports/expense-attachment.storage';
import { ExpenseApprovalNotifier } from './expenses/application/ports/expense-approval.notifier';
import { ExpenseApprovalRepository } from './expenses/application/ports/expense-approval.repository';
import { ExpenseComparisonRepository } from './expenses/application/ports/expense-comparison.repository';
import { ExpenseDashboardRepository } from './expenses/application/ports/expense-dashboard.repository';
import { ExpenseManagementRepository } from './expenses/application/ports/expense-management.repository';
import { ExpensePaidReportRepository } from './expenses/application/ports/expense-paid-report.repository';
import { ExpensePaymentRepository } from './expenses/application/ports/expense-payment.repository';
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
import { LocalExpenseAttachmentStorage } from './infrastructure/storage/local-expense-attachment.storage';
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
      provide: ExpenseAttachmentStorage,
      useClass: LocalExpenseAttachmentStorage,
    },
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

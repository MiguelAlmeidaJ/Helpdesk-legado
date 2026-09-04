import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { ExpenseAdminDashboardService } from './application/expense-admin-dashboard.service';
import { ExpenseApprovalService } from './application/expense-approval.service';
import { ExpenseComparisonService } from './application/expense-comparison.service';
import { ExpenseDashboardService } from './application/expense-dashboard.service';
import { ExpenseManagementService } from './application/expense-management.service';
import { ExpensePaymentService } from './application/expense-payment.service';
import { ExpensePaidReportService } from './application/expense-paid-report.service';
import { VehicleAgendaService } from './application/vehicle-agenda.service';
import { ExpenseAdminDashboardRepository } from './infrastructure/expense-admin-dashboard.repository';
import { ExpenseApprovalMailer } from './infrastructure/expense-approval.mailer';
import { ExpenseApprovalRepository } from './infrastructure/expense-approval.repository';
import { ExpenseComparisonRepository } from './infrastructure/expense-comparison.repository';
import { ExpenseDashboardRepository } from './infrastructure/expense-dashboard.repository';
import { ExpenseManagementRepository } from './infrastructure/expense-management.repository';
import { ExpensePaymentRepository } from './infrastructure/expense-payment.repository';
import { ExpensePaidReportRepository } from './infrastructure/expense-paid-report.repository';
import { VehicleAgendaRepository } from './infrastructure/vehicle-agenda.repository';
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
    ExpenseAdminDashboardRepository,
    ExpenseAdminDashboardService,
    ExpenseApprovalRepository,
    ExpenseApprovalMailer,
    ExpenseApprovalService,
    ExpenseComparisonRepository,
    ExpenseComparisonService,
    ExpenseDashboardRepository,
    ExpenseDashboardService,
    ExpenseManagementRepository,
    ExpenseManagementService,
    ExpensePaymentRepository,
    ExpensePaymentService,
    ExpensePaidReportRepository,
    ExpensePaidReportService,
    VehicleAgendaRepository,
    VehicleAgendaService,
  ],
})
export class LogisticsModule {}

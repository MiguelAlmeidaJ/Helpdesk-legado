import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { ExpenseAdminDashboardService } from './application/expense-admin-dashboard.service';
import { ExpenseApprovalService } from './application/expense-approval.service';
import { ExpenseDashboardService } from './application/expense-dashboard.service';
import { ExpenseManagementService } from './application/expense-management.service';
import { VehicleAgendaService } from './application/vehicle-agenda.service';
import { ExpenseAdminDashboardRepository } from './infrastructure/expense-admin-dashboard.repository';
import { ExpenseApprovalMailer } from './infrastructure/expense-approval.mailer';
import { ExpenseApprovalRepository } from './infrastructure/expense-approval.repository';
import { ExpenseDashboardRepository } from './infrastructure/expense-dashboard.repository';
import { ExpenseManagementRepository } from './infrastructure/expense-management.repository';
import { VehicleAgendaRepository } from './infrastructure/vehicle-agenda.repository';
import { ExpenseAdminDashboardController } from './presentation/http/expense-admin-dashboard.controller';
import { ExpenseApprovalController } from './presentation/http/expense-approval.controller';
import { ExpenseDashboardController } from './presentation/http/expense-dashboard.controller';
import { ExpenseManagementController } from './presentation/http/expense-management.controller';
import { VehicleAgendaController } from './presentation/http/vehicle-agenda.controller';

@Module({
  imports: [AccessModule],
  controllers: [
    ExpenseAdminDashboardController,
    ExpenseApprovalController,
    ExpenseDashboardController,
    ExpenseManagementController,
    VehicleAgendaController,
  ],
  providers: [
    ExpenseAdminDashboardRepository,
    ExpenseAdminDashboardService,
    ExpenseApprovalRepository,
    ExpenseApprovalMailer,
    ExpenseApprovalService,
    ExpenseDashboardRepository,
    ExpenseDashboardService,
    ExpenseManagementRepository,
    ExpenseManagementService,
    VehicleAgendaRepository,
    VehicleAgendaService,
  ],
})
export class LogisticsModule {}

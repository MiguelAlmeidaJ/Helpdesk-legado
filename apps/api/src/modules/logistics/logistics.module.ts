import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { ExpenseAdminDashboardService } from './application/expense-admin-dashboard.service';
import { ExpenseDashboardService } from './application/expense-dashboard.service';
import { ExpenseManagementService } from './application/expense-management.service';
import { VehicleAgendaService } from './application/vehicle-agenda.service';
import { ExpenseAdminDashboardRepository } from './infrastructure/expense-admin-dashboard.repository';
import { ExpenseDashboardRepository } from './infrastructure/expense-dashboard.repository';
import { ExpenseManagementRepository } from './infrastructure/expense-management.repository';
import { VehicleAgendaRepository } from './infrastructure/vehicle-agenda.repository';
import { ExpenseAdminDashboardController } from './presentation/http/expense-admin-dashboard.controller';
import { ExpenseDashboardController } from './presentation/http/expense-dashboard.controller';
import { ExpenseManagementController } from './presentation/http/expense-management.controller';
import { VehicleAgendaController } from './presentation/http/vehicle-agenda.controller';

@Module({
  imports: [AccessModule],
  controllers: [
    ExpenseAdminDashboardController,
    ExpenseDashboardController,
    ExpenseManagementController,
    VehicleAgendaController,
  ],
  providers: [
    ExpenseAdminDashboardRepository,
    ExpenseAdminDashboardService,
    ExpenseDashboardRepository,
    ExpenseDashboardService,
    ExpenseManagementRepository,
    ExpenseManagementService,
    VehicleAgendaRepository,
    VehicleAgendaService,
  ],
})
export class LogisticsModule {}

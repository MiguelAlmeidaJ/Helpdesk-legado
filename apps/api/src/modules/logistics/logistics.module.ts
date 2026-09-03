import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { ExpenseDashboardService } from './application/expense-dashboard.service';
import { ExpenseManagementService } from './application/expense-management.service';
import { VehicleAgendaService } from './application/vehicle-agenda.service';
import { ExpenseDashboardRepository } from './infrastructure/expense-dashboard.repository';
import { ExpenseManagementRepository } from './infrastructure/expense-management.repository';
import { VehicleAgendaRepository } from './infrastructure/vehicle-agenda.repository';
import { ExpenseDashboardController } from './presentation/http/expense-dashboard.controller';
import { ExpenseManagementController } from './presentation/http/expense-management.controller';
import { VehicleAgendaController } from './presentation/http/vehicle-agenda.controller';

@Module({
  imports: [AccessModule],
  controllers: [
    ExpenseDashboardController,
    ExpenseManagementController,
    VehicleAgendaController,
  ],
  providers: [
    ExpenseDashboardRepository,
    ExpenseDashboardService,
    ExpenseManagementRepository,
    ExpenseManagementService,
    VehicleAgendaRepository,
    VehicleAgendaService,
  ],
})
export class LogisticsModule {}

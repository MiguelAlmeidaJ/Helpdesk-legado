import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { ExpenseDashboardService } from './application/expense-dashboard.service';
import { VehicleAgendaService } from './application/vehicle-agenda.service';
import { ExpenseDashboardRepository } from './infrastructure/expense-dashboard.repository';
import { VehicleAgendaRepository } from './infrastructure/vehicle-agenda.repository';
import { ExpenseDashboardController } from './presentation/http/expense-dashboard.controller';
import { VehicleAgendaController } from './presentation/http/vehicle-agenda.controller';

@Module({
  imports: [AccessModule],
  controllers: [ExpenseDashboardController, VehicleAgendaController],
  providers: [
    ExpenseDashboardRepository,
    ExpenseDashboardService,
    VehicleAgendaRepository,
    VehicleAgendaService,
  ],
})
export class LogisticsModule {}

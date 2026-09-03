import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { VehicleAgendaService } from './application/vehicle-agenda.service';
import { VehicleAgendaRepository } from './infrastructure/vehicle-agenda.repository';
import { VehicleAgendaController } from './presentation/http/vehicle-agenda.controller';

@Module({
  imports: [AccessModule],
  controllers: [VehicleAgendaController],
  providers: [VehicleAgendaRepository, VehicleAgendaService],
})
export class LogisticsModule {}

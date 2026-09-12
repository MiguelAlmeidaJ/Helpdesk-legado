import { Module } from '@nestjs/common';
import { AccessModule } from '../../access/access.module';
import { VehicleAgendaRepository } from './application/ports/vehicle-agenda.repository';
import { VehicleAgendaService } from './application/vehicle-agenda.service';
import { VehicleAgendaRepository as VehicleAgendaRepositoryImpl } from './infrastructure/vehicle-agenda.repository';
import { VehicleAgendaController } from './presentation/http/vehicle-agenda.controller';

@Module({
  imports: [AccessModule],
  controllers: [VehicleAgendaController],
  providers: [
    {
      provide: VehicleAgendaRepository,
      useClass: VehicleAgendaRepositoryImpl,
    },
    VehicleAgendaService,
  ],
})
export class VehiclesModule {}

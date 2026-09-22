import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { MaintenanceService } from './application/maintenance.service';
import { MaintenanceController } from './presentation/http/maintenance.controller';

@Module({
  imports: [AccessModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}

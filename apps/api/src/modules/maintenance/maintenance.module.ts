import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { MaintenanceService } from './application/maintenance.service';
import { MaintenanceBackupPoller } from './infrastructure/automation/maintenance-backup.poller';
import { MaintenanceController } from './presentation/http/maintenance.controller';

@Module({
  imports: [AccessModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceBackupPoller],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}

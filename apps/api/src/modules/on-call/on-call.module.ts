import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { OnCallManagementService } from './application/on-call-management.service';
import { OnCallManagementController } from './presentation/on-call-management.controller';

@Module({
  imports: [AccessModule],
  controllers: [OnCallManagementController],
  providers: [OnCallManagementService],
})
export class OnCallModule {}

import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { GetDashboard } from './application/get-dashboard';
import { DashboardRepository } from './application/ports/dashboard.repository';
import { PrismaDashboardRepository } from './infrastructure/dashboard.repository';
import { DashboardController } from './presentation/http/dashboard.controller';

@Module({
  imports: [AccessModule],
  controllers: [DashboardController],
  providers: [
    GetDashboard,
    {
      provide: DashboardRepository,
      useClass: PrismaDashboardRepository,
    },
  ],
})
export class DashboardModule {}

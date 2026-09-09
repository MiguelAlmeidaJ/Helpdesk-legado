import { Module } from '@nestjs/common';
import { AccessModule } from './access/access.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LogisticsModule } from './logistics/logistics.module';
import { ReportsModule } from './reports/reports.module';
import { TicketsModule } from './tickets/tickets.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AccessModule,
    DashboardModule,
    LogisticsModule,
    ReportsModule,
    TicketsModule,
    UsersModule,
  ],
})
export class ModulesModule {}

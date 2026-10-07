import { Module } from '@nestjs/common';
import { AccessModule } from './access/access.module';
import { CatalogModule } from './catalog/catalog.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LogisticsModule } from './logistics/logistics.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { NavigationModule } from './navigation/navigation.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OnCallModule } from './on-call/on-call.module';
import { QualityModule } from './quality/quality.module';
import { ReportsModule } from './reports/reports.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { TicketsModule } from './tickets/tickets.module';
import { AtendimentoTicketsModule } from './tickets/types/atendimento/atendimento-tickets.module';
import { DevOpsTicketsModule } from './tickets/types/devops/devops-tickets.module';
import { MarketingTicketsModule } from './tickets/types/marketing/marketing-tickets.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AccessModule,
    CatalogModule,
    DashboardModule,
    LogisticsModule,
    MaintenanceModule,
    NavigationModule,
    // Static and specialized ticket routes must be registered before the
    // generic /tickets/:id endpoints from AtendimentoTicketsModule.
    MarketingTicketsModule,
    DevOpsTicketsModule,
    TicketsModule,
    AtendimentoTicketsModule,
    NotificationsModule,
    OnCallModule,
    QualityModule,
    ReportsModule,
    RegistrationsModule,
    UsersModule,
  ],
})
export class ModulesModule {}

import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { TicketTypeRegistry } from './application/ticket-type-registry';
import { TicketTypesController } from './presentation/http/ticket-types.controller';
import { TicketTypeAccessModule } from './ticket-type-access.module';
import { AtendimentoTicketsModule } from './types/atendimento/atendimento-tickets.module';
import { DevOpsTicketsModule } from './types/devops/devops-tickets.module';
import { MarketingTicketsModule } from './types/marketing/marketing-tickets.module';

@Module({
  imports: [
    AccessModule,
    TicketTypeAccessModule,
    AtendimentoTicketsModule,
    DevOpsTicketsModule,
    MarketingTicketsModule,
  ],
  controllers: [TicketTypesController],
  providers: [TicketTypeRegistry],
})
export class TicketsModule {}

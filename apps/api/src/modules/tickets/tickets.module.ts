import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { TicketTypeRegistry } from './application/ticket-type-registry';
import { TicketTypesController } from './presentation/http/ticket-types.controller';
import { AtendimentoTicketsModule } from './types/atendimento/atendimento-tickets.module';
import { DevOpsTicketsModule } from './types/devops/devops-tickets.module';

@Module({
  imports: [AccessModule, AtendimentoTicketsModule, DevOpsTicketsModule],
  controllers: [TicketTypesController],
  providers: [TicketTypeRegistry],
})
export class TicketsModule {}

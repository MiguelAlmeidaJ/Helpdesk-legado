import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { TicketTypeRegistry } from './application/ticket-type-registry';
import { TicketTypesController } from './presentation/http/ticket-types.controller';
import { TicketTypeAccessModule } from './ticket-type-access.module';

@Module({
  imports: [AccessModule, TicketTypeAccessModule],
  controllers: [TicketTypesController],
  providers: [TicketTypeRegistry],
})
export class TicketsModule {}

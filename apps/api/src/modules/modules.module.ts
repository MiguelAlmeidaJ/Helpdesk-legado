import { Module } from '@nestjs/common';
import { AccessModule } from './access/access.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [AccessModule, TicketsModule],
})
export class ModulesModule {}

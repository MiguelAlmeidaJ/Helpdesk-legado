import { Module } from '@nestjs/common';
import { AccessModule } from './access/access.module';
import { TicketsModule } from './tickets/tickets.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AccessModule, TicketsModule, UsersModule],
})
export class ModulesModule {}

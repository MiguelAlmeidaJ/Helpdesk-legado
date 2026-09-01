import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { ListTickets } from './application/list-tickets';
import { TicketsReadRepository } from './application/ports/tickets-read.repository';
import { PrismaTicketsReadRepository } from './infrastructure/persistence/prisma-tickets-read.repository';
import { TicketsController } from './presentation/http/tickets.controller';

@Module({
  imports: [AccessModule],
  controllers: [TicketsController],
  providers: [
    ListTickets,
    {
      provide: TicketsReadRepository,
      useClass: PrismaTicketsReadRepository,
    },
  ],
})
export class TicketsModule {}

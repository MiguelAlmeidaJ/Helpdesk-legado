import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { GetTicketDetail } from './application/get-ticket-detail';
import { ListTickets } from './application/list-tickets';
import { TicketDetailRepository } from './application/ports/ticket-detail.repository';
import { TicketsReadRepository } from './application/ports/tickets-read.repository';
import { PrismaTicketDetailRepository } from './infrastructure/persistence/prisma-ticket-detail.repository';
import { PrismaTicketsReadRepository } from './infrastructure/persistence/prisma-tickets-read.repository';
import { TicketsController } from './presentation/http/tickets.controller';

@Module({
  imports: [AccessModule],
  controllers: [TicketsController],
  providers: [
    GetTicketDetail,
    ListTickets,
    {
      provide: TicketDetailRepository,
      useClass: PrismaTicketDetailRepository,
    },
    {
      provide: TicketsReadRepository,
      useClass: PrismaTicketsReadRepository,
    },
  ],
})
export class TicketsModule {}

import { Module } from '@nestjs/common';
import { AccessModule } from '../../../access/access.module';
import { TicketTypeAccessModule } from '../../ticket-type-access.module';
import { MarketingTickets } from './application/marketing-tickets';
import { MarketingTicketRepository } from './application/ports/marketing-ticket.repository';
import { MarketingTicketScheduleRunner } from './infrastructure/marketing-ticket-schedule.runner';
import { PrismaMarketingTicketRepository } from './infrastructure/prisma-marketing-ticket.repository';
import { MarketingTicketsController } from './presentation/marketing-tickets.controller';

@Module({
  imports: [AccessModule, TicketTypeAccessModule],
  controllers: [MarketingTicketsController],
  providers: [
    MarketingTickets,
    MarketingTicketScheduleRunner,
    {
      provide: MarketingTicketRepository,
      useClass: PrismaMarketingTicketRepository,
    },
  ],
})
export class MarketingTicketsModule {}

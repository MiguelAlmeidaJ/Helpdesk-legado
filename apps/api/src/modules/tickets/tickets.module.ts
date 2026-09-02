import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { AddTicketInteraction } from './application/add-ticket-interaction';
import { GetTicketDetail } from './application/get-ticket-detail';
import { ListTicketAssignmentOptions } from './application/list-ticket-assignment-options';
import { ListTicketRejectionOptions } from './application/list-ticket-rejection-options';
import { ListTickets } from './application/list-tickets';
import { TicketAssignmentRepository } from './application/ports/ticket-assignment.repository';
import { TicketDetailRepository } from './application/ports/ticket-detail.repository';
import { TicketInteractionRepository } from './application/ports/ticket-interaction.repository';
import { TicketRejectionRepository } from './application/ports/ticket-rejection.repository';
import { TicketsReadRepository } from './application/ports/tickets-read.repository';
import { RejectTicket } from './application/reject-ticket';
import { UpdateTicketAssignment } from './application/update-ticket-assignment';
import { PrismaTicketAssignmentRepository } from './infrastructure/persistence/prisma-ticket-assignment.repository';
import { PrismaTicketDetailRepository } from './infrastructure/persistence/prisma-ticket-detail.repository';
import { PrismaTicketInteractionRepository } from './infrastructure/persistence/prisma-ticket-interaction.repository';
import { PrismaTicketRejectionRepository } from './infrastructure/persistence/prisma-ticket-rejection.repository';
import { PrismaTicketsReadRepository } from './infrastructure/persistence/prisma-tickets-read.repository';
import { TicketsController } from './presentation/http/tickets.controller';

@Module({
  imports: [AccessModule],
  controllers: [TicketsController],
  providers: [
    AddTicketInteraction,
    GetTicketDetail,
    ListTicketAssignmentOptions,
    ListTicketRejectionOptions,
    ListTickets,
    RejectTicket,
    UpdateTicketAssignment,
    {
      provide: TicketAssignmentRepository,
      useClass: PrismaTicketAssignmentRepository,
    },
    {
      provide: TicketRejectionRepository,
      useClass: PrismaTicketRejectionRepository,
    },
    {
      provide: TicketInteractionRepository,
      useClass: PrismaTicketInteractionRepository,
    },
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

import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { AddTicketInteraction } from './application/add-ticket-interaction';
import { ConcludeTicket } from './application/conclude-ticket';
import { FinalizeTicket } from './application/finalize-ticket';
import { GetTicketClassificationCatalogs } from './application/get-ticket-classification-catalogs';
import { GetTicketDetail } from './application/get-ticket-detail';
import { ListTicketAssignmentOptions } from './application/list-ticket-assignment-options';
import { ListTicketRejectionOptions } from './application/list-ticket-rejection-options';
import { ListTickets } from './application/list-tickets';
import { TicketAssignmentRepository } from './application/ports/ticket-assignment.repository';
import { TicketAttachmentRepository } from './application/ports/ticket-attachment.repository';
import { TicketClassificationRepository } from './application/ports/ticket-classification.repository';
import { TicketCloseRepository } from './application/ports/ticket-close.repository';
import { TicketDetailRepository } from './application/ports/ticket-detail.repository';
import { TicketHoldRepository } from './application/ports/ticket-hold.repository';
import { TicketInteractionRepository } from './application/ports/ticket-interaction.repository';
import { TicketRejectionRepository } from './application/ports/ticket-rejection.repository';
import { TicketsReadRepository } from './application/ports/tickets-read.repository';
import { PutTicketOnHold } from './application/put-ticket-on-hold';
import { RejectTicket } from './application/reject-ticket';
import { ResumeTicket } from './application/resume-ticket';
import { TicketAttachments } from './application/ticket-attachments';
import { UpdateTicketAssignment } from './application/update-ticket-assignment';
import { UpdateTicketClassification } from './application/update-ticket-classification';
import { PrismaTicketAssignmentRepository } from './infrastructure/persistence/prisma-ticket-assignment.repository';
import { PrismaTicketAttachmentRepository } from './infrastructure/persistence/prisma-ticket-attachment.repository';
import { PrismaTicketClassificationRepository } from './infrastructure/persistence/prisma-ticket-classification.repository';
import { PrismaTicketCloseRepository } from './infrastructure/persistence/prisma-ticket-close.repository';
import { PrismaTicketDetailRepository } from './infrastructure/persistence/prisma-ticket-detail.repository';
import { PrismaTicketHoldRepository } from './infrastructure/persistence/prisma-ticket-hold.repository';
import { PrismaTicketInteractionRepository } from './infrastructure/persistence/prisma-ticket-interaction.repository';
import { PrismaTicketRejectionRepository } from './infrastructure/persistence/prisma-ticket-rejection.repository';
import { PrismaTicketsReadRepository } from './infrastructure/persistence/prisma-tickets-read.repository';
import { TicketAttachmentsController } from './presentation/http/ticket-attachments.controller';
import { TicketClassificationController } from './presentation/http/ticket-classification.controller';
import { TicketWorkflowController } from './presentation/http/ticket-workflow.controller';
import { TicketsController } from './presentation/http/tickets.controller';

@Module({
  imports: [AccessModule],
  controllers: [
    TicketsController,
    TicketWorkflowController,
    TicketClassificationController,
    TicketAttachmentsController,
  ],
  providers: [
    AddTicketInteraction,
    ConcludeTicket,
    FinalizeTicket,
    GetTicketClassificationCatalogs,
    GetTicketDetail,
    ListTicketAssignmentOptions,
    ListTicketRejectionOptions,
    ListTickets,
    PutTicketOnHold,
    RejectTicket,
    ResumeTicket,
    TicketAttachments,
    UpdateTicketAssignment,
    UpdateTicketClassification,
    { provide: TicketAssignmentRepository, useClass: PrismaTicketAssignmentRepository },
    { provide: TicketAttachmentRepository, useClass: PrismaTicketAttachmentRepository },
    { provide: TicketClassificationRepository, useClass: PrismaTicketClassificationRepository },
    { provide: TicketCloseRepository, useClass: PrismaTicketCloseRepository },
    { provide: TicketHoldRepository, useClass: PrismaTicketHoldRepository },
    { provide: TicketRejectionRepository, useClass: PrismaTicketRejectionRepository },
    { provide: TicketInteractionRepository, useClass: PrismaTicketInteractionRepository },
    { provide: TicketDetailRepository, useClass: PrismaTicketDetailRepository },
    { provide: TicketsReadRepository, useClass: PrismaTicketsReadRepository },
  ],
})
export class TicketsModule {}

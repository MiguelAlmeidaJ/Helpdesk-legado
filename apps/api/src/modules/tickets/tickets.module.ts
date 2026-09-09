import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { AddTicketInteraction } from './application/add-ticket-interaction';
import { CreateTicket } from './application/create-ticket';
import { ConcludeTicket } from './application/conclude-ticket';
import { FinalizeTicket } from './application/finalize-ticket';
import { GetTicketClassificationCatalogs } from './application/get-ticket-classification-catalogs';
import { GetTicketDetail } from './application/get-ticket-detail';
import { GetTicketAvailability } from './application/get-ticket-availability';
import { GetTicketTimeline } from './application/get-ticket-timeline';
import { ListTicketAssignmentOptions } from './application/list-ticket-assignment-options';
import { ListTicketRejectionOptions } from './application/list-ticket-rejection-options';
import { ListTicketProjects } from './application/list-ticket-projects';
import { TicketFacilityCommands } from './application/ticket-facility-commands';
import { TicketProjectStructure } from './application/ticket-project-structure';
import { TicketProjectScheduleActivation } from './application/ticket-project-schedule-activation';
import { TicketProjectWorkflow } from './application/ticket-project-workflow';
import { TicketProjectTaskImages } from './application/ticket-project-task-images';
import { TicketProjectTaskWorkflow } from './application/ticket-project-task-workflow';
import { ListTickets } from './application/list-tickets';
import { TicketAssignmentRepository } from './application/ports/ticket-assignment.repository';
import { TicketAttachmentRepository } from './application/ports/ticket-attachment.repository';
import { TicketCreateRepository } from './application/ports/ticket-create.repository';
import { TicketClassificationRepository } from './application/ports/ticket-classification.repository';
import { TicketCloseRepository } from './application/ports/ticket-close.repository';
import { TicketDetailRepository } from './application/ports/ticket-detail.repository';
import { TicketHoldRepository } from './application/ports/ticket-hold.repository';
import { TicketInteractionRepository } from './application/ports/ticket-interaction.repository';
import { TicketFacilityCommandRepository } from './application/ports/ticket-facility-command.repository';
import { TicketProjectCommandRepository } from './application/ports/ticket-project-command.repository';
import { TicketProjectReadRepository } from './application/ports/ticket-project-read.repository';
import { TicketProjectScheduleActivationRepository } from './application/ports/ticket-project-schedule-activation.repository';
import { TicketProjectStructureRepository } from './application/ports/ticket-project-structure.repository';
import { TicketProjectTaskImageRepository } from './application/ports/ticket-project-task-image.repository';
import { TicketProjectTaskCommandRepository } from './application/ports/ticket-project-task-command.repository';
import { TicketAvailabilityRepository } from './application/ports/ticket-availability.repository';
import { TicketTimelineRepository } from './application/ports/ticket-timeline.repository';
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
import { PrismaTicketCreateRepository } from './infrastructure/persistence/prisma-ticket-create.repository';
import { PrismaTicketClassificationRepository } from './infrastructure/persistence/prisma-ticket-classification.repository';
import { PrismaTicketCloseRepository } from './infrastructure/persistence/prisma-ticket-close.repository';
import { PrismaTicketDetailRepository } from './infrastructure/persistence/prisma-ticket-detail.repository';
import { PrismaTicketHoldRepository } from './infrastructure/persistence/prisma-ticket-hold.repository';
import { PrismaTicketInteractionRepository } from './infrastructure/persistence/prisma-ticket-interaction.repository';
import { PrismaTicketFacilityCommandRepository } from './infrastructure/persistence/prisma-ticket-facility-command.repository';
import { PrismaTicketProjectCommandRepository } from './infrastructure/persistence/prisma-ticket-project-command.repository';
import { PrismaTicketProjectReadRepository } from './infrastructure/persistence/prisma-ticket-project-read.repository';
import { PrismaTicketProjectScheduleActivationRepository } from './infrastructure/persistence/prisma-ticket-project-schedule-activation.repository';
import { PrismaTicketProjectStructureRepository } from './infrastructure/persistence/prisma-ticket-project-structure.repository';
import { PrismaTicketProjectTaskImageRepository } from './infrastructure/persistence/prisma-ticket-project-task-image.repository';
import { PrismaTicketProjectTaskCommandRepository } from './infrastructure/persistence/prisma-ticket-project-task-command.repository';
import { PrismaTicketAvailabilityRepository } from './infrastructure/persistence/prisma-ticket-availability.repository';
import { PrismaTicketTimelineRepository } from './infrastructure/persistence/prisma-ticket-timeline.repository';
import { PrismaTicketRejectionRepository } from './infrastructure/persistence/prisma-ticket-rejection.repository';
import { PrismaTicketsReadRepository } from './infrastructure/persistence/prisma-tickets-read.repository';
import { TicketProjectScheduleActivationRunner } from './infrastructure/runtime/ticket-project-schedule-activation.runner';
import { TicketAttachmentsController } from './presentation/http/ticket-attachments.controller';
import { TicketFacilityController } from './presentation/http/ticket-facility.controller';
import { TicketAvailabilityController } from './presentation/http/ticket-availability.controller';
import { TicketTimelineController } from './presentation/http/ticket-timeline.controller';
import { TicketProjectsController } from './presentation/http/ticket-projects.controller';
import { TicketProjectStructureController } from './presentation/http/ticket-project-structure.controller';
import { TicketProjectWorkflowController } from './presentation/http/ticket-project-workflow.controller';
import { TicketProjectTaskImagesController } from './presentation/http/ticket-project-task-images.controller';
import { TicketProjectTaskWorkflowController } from './presentation/http/ticket-project-task-workflow.controller';
import { TicketCreateController } from './presentation/http/ticket-create.controller';
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
    TicketCreateController,
    TicketFacilityController,
    TicketAvailabilityController,
    TicketTimelineController,
    TicketProjectsController,
    TicketProjectStructureController,
    TicketProjectWorkflowController,
    TicketProjectTaskImagesController,
    TicketProjectTaskWorkflowController,
  ],
  providers: [
    AddTicketInteraction,
    CreateTicket,
    ConcludeTicket,
    FinalizeTicket,
    GetTicketClassificationCatalogs,
    GetTicketDetail,
    GetTicketAvailability,
    GetTicketTimeline,
    ListTicketAssignmentOptions,
    ListTicketRejectionOptions,
    ListTicketProjects,
    TicketFacilityCommands,
    TicketProjectStructure,
    TicketProjectScheduleActivation,
    TicketProjectScheduleActivationRunner,
    TicketProjectWorkflow,
    TicketProjectTaskImages,
    TicketProjectTaskWorkflow,
    ListTickets,
    PutTicketOnHold,
    RejectTicket,
    ResumeTicket,
    TicketAttachments,
    UpdateTicketAssignment,
    UpdateTicketClassification,
    { provide: TicketAssignmentRepository, useClass: PrismaTicketAssignmentRepository },
    { provide: TicketAttachmentRepository, useClass: PrismaTicketAttachmentRepository },
    { provide: TicketCreateRepository, useClass: PrismaTicketCreateRepository },
    { provide: TicketClassificationRepository, useClass: PrismaTicketClassificationRepository },
    { provide: TicketCloseRepository, useClass: PrismaTicketCloseRepository },
    { provide: TicketHoldRepository, useClass: PrismaTicketHoldRepository },
    { provide: TicketRejectionRepository, useClass: PrismaTicketRejectionRepository },
    { provide: TicketInteractionRepository, useClass: PrismaTicketInteractionRepository },
    { provide: TicketFacilityCommandRepository, useClass: PrismaTicketFacilityCommandRepository },
    { provide: TicketProjectCommandRepository, useClass: PrismaTicketProjectCommandRepository },
    { provide: TicketProjectReadRepository, useClass: PrismaTicketProjectReadRepository },
    { provide: TicketProjectScheduleActivationRepository, useClass: PrismaTicketProjectScheduleActivationRepository },
    { provide: TicketProjectStructureRepository, useClass: PrismaTicketProjectStructureRepository },
    { provide: TicketProjectTaskImageRepository, useClass: PrismaTicketProjectTaskImageRepository },
    { provide: TicketProjectTaskCommandRepository, useClass: PrismaTicketProjectTaskCommandRepository },
    { provide: TicketAvailabilityRepository, useClass: PrismaTicketAvailabilityRepository },
    { provide: TicketTimelineRepository, useClass: PrismaTicketTimelineRepository },
    { provide: TicketDetailRepository, useClass: PrismaTicketDetailRepository },
    { provide: TicketsReadRepository, useClass: PrismaTicketsReadRepository },
  ],
})
export class TicketsModule {}

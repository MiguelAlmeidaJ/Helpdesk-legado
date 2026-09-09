import { Module } from '@nestjs/common';
import { AccessModule } from '../../../access/access.module';
import { ListTicketProjects } from '../../application/list-ticket-projects';
import { TicketProjectStructure } from '../../application/ticket-project-structure';
import { TicketProjectScheduleActivation } from '../../application/ticket-project-schedule-activation';
import { TicketProjectWorkflow } from '../../application/ticket-project-workflow';
import { TicketProjectTaskImages } from '../../application/ticket-project-task-images';
import { TicketProjectTaskWorkflow } from '../../application/ticket-project-task-workflow';
import { TicketProjectCommandRepository } from '../../application/ports/ticket-project-command.repository';
import { TicketProjectReadRepository } from '../../application/ports/ticket-project-read.repository';
import { TicketProjectScheduleActivationRepository } from '../../application/ports/ticket-project-schedule-activation.repository';
import { TicketProjectStructureRepository } from '../../application/ports/ticket-project-structure.repository';
import { TicketProjectTaskImageRepository } from '../../application/ports/ticket-project-task-image.repository';
import { TicketProjectTaskCommandRepository } from '../../application/ports/ticket-project-task-command.repository';
import { PrismaTicketProjectCommandRepository } from '../../infrastructure/persistence/prisma-ticket-project-command.repository';
import { PrismaTicketProjectReadRepository } from '../../infrastructure/persistence/prisma-ticket-project-read.repository';
import { PrismaTicketProjectScheduleActivationRepository } from '../../infrastructure/persistence/prisma-ticket-project-schedule-activation.repository';
import { PrismaTicketProjectStructureRepository } from '../../infrastructure/persistence/prisma-ticket-project-structure.repository';
import { PrismaTicketProjectTaskImageRepository } from '../../infrastructure/persistence/prisma-ticket-project-task-image.repository';
import { PrismaTicketProjectTaskCommandRepository } from '../../infrastructure/persistence/prisma-ticket-project-task-command.repository';
import { TicketProjectScheduleActivationRunner } from '../../infrastructure/runtime/ticket-project-schedule-activation.runner';
import { TicketProjectsController } from '../../presentation/http/ticket-projects.controller';
import { TicketProjectStructureController } from '../../presentation/http/ticket-project-structure.controller';
import { TicketProjectWorkflowController } from '../../presentation/http/ticket-project-workflow.controller';
import { TicketProjectTaskImagesController } from '../../presentation/http/ticket-project-task-images.controller';
import { TicketProjectTaskWorkflowController } from '../../presentation/http/ticket-project-task-workflow.controller';

@Module({
  imports: [AccessModule],
  controllers: [
    TicketProjectsController,
    TicketProjectStructureController,
    TicketProjectWorkflowController,
    TicketProjectTaskImagesController,
    TicketProjectTaskWorkflowController,
  ],
  providers: [
    ListTicketProjects,
    TicketProjectStructure,
    TicketProjectScheduleActivation,
    TicketProjectScheduleActivationRunner,
    TicketProjectWorkflow,
    TicketProjectTaskImages,
    TicketProjectTaskWorkflow,
    { provide: TicketProjectCommandRepository, useClass: PrismaTicketProjectCommandRepository },
    { provide: TicketProjectReadRepository, useClass: PrismaTicketProjectReadRepository },
    { provide: TicketProjectScheduleActivationRepository, useClass: PrismaTicketProjectScheduleActivationRepository },
    { provide: TicketProjectStructureRepository, useClass: PrismaTicketProjectStructureRepository },
    { provide: TicketProjectTaskImageRepository, useClass: PrismaTicketProjectTaskImageRepository },
    { provide: TicketProjectTaskCommandRepository, useClass: PrismaTicketProjectTaskCommandRepository },
  ],
})
export class DevOpsTicketsModule {}

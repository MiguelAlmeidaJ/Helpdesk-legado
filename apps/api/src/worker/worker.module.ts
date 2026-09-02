import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../core/database/database.module';
import { ActivateDueScheduledTickets } from '../modules/tickets/application/activate-due-scheduled-tickets';
import { DueScheduledTicketRepository } from '../modules/tickets/application/ports/due-scheduled-ticket.repository';
import { DueTicketHoldRepository } from '../modules/tickets/application/ports/due-ticket-hold.repository';
import { TicketRecurrenceRepository } from '../modules/tickets/application/ports/ticket-recurrence.repository';
import { ProcessDueTicketRecurrences } from '../modules/tickets/application/process-due-ticket-recurrences';
import { ResumeDueTicketHolds } from '../modules/tickets/application/resume-due-ticket-holds';
import { TicketHoldAutoResumePoller } from '../modules/tickets/infrastructure/automation/ticket-hold-auto-resume.poller';
import { TicketRecurrencePoller } from '../modules/tickets/infrastructure/automation/ticket-recurrence.poller';
import { TicketScheduledActivationPoller } from '../modules/tickets/infrastructure/automation/ticket-scheduled-activation.poller';
import { PrismaDueScheduledTicketRepository } from '../modules/tickets/infrastructure/persistence/prisma-due-scheduled-ticket.repository';
import { PrismaDueTicketHoldRepository } from '../modules/tickets/infrastructure/persistence/prisma-due-ticket-hold.repository';
import { PrismaTicketRecurrenceRepository } from '../modules/tickets/infrastructure/persistence/prisma-ticket-recurrence.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
  ],
  providers: [
    ActivateDueScheduledTickets,
    ProcessDueTicketRecurrences,
    ResumeDueTicketHolds,
    TicketHoldAutoResumePoller,
    TicketRecurrencePoller,
    TicketScheduledActivationPoller,
    {
      provide: DueScheduledTicketRepository,
      useClass: PrismaDueScheduledTicketRepository,
    },
    {
      provide: DueTicketHoldRepository,
      useClass: PrismaDueTicketHoldRepository,
    },
    {
      provide: TicketRecurrenceRepository,
      useClass: PrismaTicketRecurrenceRepository,
    },
  ],
})
export class WorkerModule {}

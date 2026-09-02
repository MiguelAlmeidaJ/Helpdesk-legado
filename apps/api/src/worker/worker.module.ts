import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../core/database/database.module';
import { ResumeDueTicketHolds } from '../modules/tickets/application/resume-due-ticket-holds';
import { DueTicketHoldRepository } from '../modules/tickets/application/ports/due-ticket-hold.repository';
import { TicketHoldAutoResumePoller } from '../modules/tickets/infrastructure/automation/ticket-hold-auto-resume.poller';
import { PrismaDueTicketHoldRepository } from '../modules/tickets/infrastructure/persistence/prisma-due-ticket-hold.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
  ],
  providers: [
    ResumeDueTicketHolds,
    TicketHoldAutoResumePoller,
    {
      provide: DueTicketHoldRepository,
      useClass: PrismaDueTicketHoldRepository,
    },
  ],
})
export class WorkerModule {}

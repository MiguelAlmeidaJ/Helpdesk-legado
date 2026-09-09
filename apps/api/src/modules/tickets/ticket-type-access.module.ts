import { Module } from '@nestjs/common';
import { TicketTypeAccessRepository } from './application/ports/ticket-type-access.repository';
import { PrismaTicketTypeAccessRepository } from './infrastructure/persistence/prisma-ticket-type-access.repository';

@Module({
  providers: [
    {
      provide: TicketTypeAccessRepository,
      useClass: PrismaTicketTypeAccessRepository,
    },
  ],
  exports: [TicketTypeAccessRepository],
})
export class TicketTypeAccessModule {}

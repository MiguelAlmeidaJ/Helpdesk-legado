import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { ListImprovements } from './application/list-improvements';
import { ImprovementReadRepository } from './application/ports/improvement-read.repository';
import { PrismaImprovementReadRepository } from './infrastructure/prisma-improvement-read.repository';
import { ImprovementsController } from './presentation/http/improvements.controller';

@Module({
  imports: [AccessModule],
  controllers: [ImprovementsController],
  providers: [
    ListImprovements,
    {
      provide: ImprovementReadRepository,
      useClass: PrismaImprovementReadRepository,
    },
  ],
})
export class ImprovementsModule {}

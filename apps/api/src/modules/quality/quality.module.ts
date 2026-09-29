import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { QualityCalendarService } from './application/quality-calendar.service';
import { QualityCalendarController } from './presentation/quality-calendar.controller';

@Module({
  imports: [AccessModule],
  controllers: [QualityCalendarController],
  providers: [QualityCalendarService],
})
export class QualityModule {}

import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { TicketTypeAccessModule } from '../tickets/ticket-type-access.module';
import { MediaAccess } from './application/media-access.service';
import { MediaService } from './application/media.service';
import { MediaDatabase } from './infrastructure/media-database.service';
import { MediaController } from './presentation/media.controller';

@Module({ imports:[AccessModule,TicketTypeAccessModule],providers:[MediaDatabase,MediaAccess,MediaService],controllers:[MediaController],exports:[MediaService] })
export class MediaModule {}

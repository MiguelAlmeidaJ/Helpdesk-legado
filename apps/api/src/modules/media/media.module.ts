import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { TicketTypeAccessModule } from '../tickets/ticket-type-access.module';
import { MediaAccess } from './application/media-access.service';
import { MediaService } from './application/media.service';
import { MediaDatabase } from './infrastructure/media-database.service';
import { MediaController } from './presentation/media.controller';
import { MediaSyncService } from './application/media-sync.service';
import { MediaSyncController } from './presentation/media-sync.controller';

@Module({ imports:[AccessModule,TicketTypeAccessModule],providers:[MediaDatabase,MediaAccess,MediaService,MediaSyncService],controllers:[MediaSyncController,MediaController],exports:[MediaService,MediaSyncService] })
export class MediaModule {}

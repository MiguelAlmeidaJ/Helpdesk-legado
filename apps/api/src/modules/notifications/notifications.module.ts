import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { AtendimentoTicketsModule } from '../tickets/types/atendimento/atendimento-tickets.module';
import { NotificationCenterService } from './application/notification-center.service';
import { NotificationsController } from './presentation/notifications.controller';

@Module({
  imports: [AccessModule, AtendimentoTicketsModule],
  controllers: [NotificationsController],
  providers: [NotificationCenterService],
})
export class NotificationsModule {}

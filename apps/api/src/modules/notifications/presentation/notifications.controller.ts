import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  type MarkNotificationsReadRequest,
  type NotificationCenterResponse,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { CurrentUser } from '../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../access/presentation/http/legacy-session.guard';
import { NotificationCenterService } from '../application/notification-center.service';

function readKeys(body: unknown): string[] {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Corpo da requisição inválido.');
  }

  const keys = (body as Partial<MarkNotificationsReadRequest>).keys;
  if (!Array.isArray(keys) || keys.length < 1 || keys.length > 100) {
    throw new BadRequestException('keys deve conter entre 1 e 100 notificações.');
  }

  const normalized = keys.map((key) => {
    if (typeof key !== 'string') {
      throw new BadRequestException('Cada key deve ser texto.');
    }
    const value = key.trim();
    if (!value || value.length > 190) {
      throw new BadRequestException('Key de notificação inválida.');
    }
    return value;
  });

  return [...new Set(normalized)];
}

@Controller('notifications')
@UseGuards(LegacySessionGuard)
export class NotificationsController {
  constructor(private readonly center: NotificationCenterService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<NotificationCenterResponse> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.center.list(user);
  }

  @Patch('read')
  async markRead(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: MarkNotificationsReadRequest,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    await this.center.markRead(user.id, readKeys(body));
  }
}

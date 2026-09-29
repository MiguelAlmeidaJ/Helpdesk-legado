import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AppPermission,
  type CommemorativeDate,
  type CommemorativeDatesResponse,
  type SaveCommemorativeDateRequest,
} from '@helpdesk/contracts';
import { LegacySessionGuard } from '../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../access/presentation/http/require-permissions.decorator';
import { QualityCalendarService } from '../application/quality-calendar.service';

function input(body: unknown): SaveCommemorativeDateRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Corpo da requisição inválido.');
  }

  const value = body as Record<string, unknown>;
  return {
    date: typeof value.date === 'string' ? value.date.trim() : '',
    name: typeof value.name === 'string' ? value.name.trim() : '',
  };
}

@Controller('quality/commemorative-dates')
@UseGuards(LegacySessionGuard, PermissionsGuard)
export class QualityCalendarController {
  constructor(private readonly calendar: QualityCalendarService) {}

  @Get()
  @RequirePermissions(AppPermission.QualityDatesRead)
  list(): Promise<CommemorativeDatesResponse> {
    return this.calendar.list();
  }

  @Post()
  @RequirePermissions(AppPermission.QualityDatesManage)
  create(@Body() body: unknown): Promise<CommemorativeDate> {
    return this.calendar.create(input(body));
  }

  @Delete(':id')
  @RequirePermissions(AppPermission.QualityDatesManage)
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    if (id < 1) throw new BadRequestException('id inválido.');
    await this.calendar.delete(id);
  }
}

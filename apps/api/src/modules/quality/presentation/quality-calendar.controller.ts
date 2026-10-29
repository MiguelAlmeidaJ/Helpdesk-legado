import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
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
    scope: value.scope as SaveCommemorativeDateRequest['scope'],
    state: typeof value.state === 'string' ? value.state.trim().toUpperCase() : '',
    municipalityId: typeof value.municipalityId === 'number' ? value.municipalityId : undefined,
  };
}

@Controller('quality/commemorative-dates')
@UseGuards(LegacySessionGuard, PermissionsGuard)
export class QualityCalendarController {
  constructor(private readonly calendar: QualityCalendarService) {}

  @Get()
  @RequirePermissions(AppPermission.QualityDatesRead)
  list(@Query('year') year?: string): Promise<CommemorativeDatesResponse> {
    return this.calendar.list(year === undefined ? undefined : Number(year));
  }

  @Get('locations')
  @RequirePermissions(AppPermission.QualityDatesRead)
  locations(@Query('state') state?: string) {
    return this.calendar.locations(state?.trim().toUpperCase());
  }

  @Post()
  @RequirePermissions(AppPermission.QualityDatesManage)
  create(@Body() body: unknown): Promise<CommemorativeDate> {
    return this.calendar.create(input(body));
  }

  @Delete('regional/:id')
  @RequirePermissions(AppPermission.QualityDatesManage)
  async deleteRegional(@Param('id', ParseIntPipe) id: number): Promise<void> {
    if (id < 1) throw new BadRequestException('id inválido.');
    await this.calendar.delete(id, true);
  }

  @Delete(':id')
  @RequirePermissions(AppPermission.QualityDatesManage)
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    if (id < 1) throw new BadRequestException('id inválido.');
    await this.calendar.delete(id);
  }
}

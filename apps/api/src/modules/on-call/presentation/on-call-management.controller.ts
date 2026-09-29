import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  AppPermission,
  type CreateOnCallHolidayRequest,
  type OnCallSettings,
  type OnCallSnapshot,
  type SaveOnCallWeekRequest,
  type UpdateOnCallSettingsRequest,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { CurrentUser } from '../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../access/presentation/http/require-permissions.decorator';
import { OnCallManagementService } from '../application/on-call-management.service';

function objectBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  return body as Record<string, unknown>;
}

function positiveId(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new BadRequestException(`${field} inválido.`);
  }
  return value;
}

@Controller('administration/on-call')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.UsersManageAccess)
export class OnCallManagementController {
  constructor(private readonly service: OnCallManagementService) {}

  @Get()
  snapshot(@Query('week') week?: string): Promise<OnCallSnapshot> {
    return this.service.snapshot(week);
  }

  @Put('week')
  async saveWeek(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    const value = objectBody(body);
    const input: SaveOnCallWeekRequest = {
      weekDate:
        typeof value.weekDate === 'string' ? value.weekDate.trim() : '',
      tiUserId: positiveId(value.tiUserId, 'tiUserId'),
      devopsUserId: positiveId(value.devopsUserId, 'devopsUserId'),
    };
    await this.service.saveWeek(input, user.id);
  }

  @Patch('settings')
  updateSettings(@Body() body: unknown): Promise<OnCallSettings> {
    const value = objectBody(body);
    const input: UpdateOnCallSettingsRequest = {
      businessStart:
        typeof value.businessStart === 'string' ? value.businessStart.trim() : '',
      businessEnd:
        typeof value.businessEnd === 'string' ? value.businessEnd.trim() : '',
    };
    return this.service.updateSettings(input);
  }

  @Post('holidays')
  async createHoliday(@Body() body: unknown): Promise<void> {
    const value = objectBody(body);
    const input: CreateOnCallHolidayRequest = {
      date: typeof value.date === 'string' ? value.date.trim() : '',
      name: typeof value.name === 'string' ? value.name.trim() : '',
    };
    await this.service.createHoliday(input);
  }

  @Delete('holidays/:id')
  async deleteHoliday(@Param('id', ParseIntPipe) id: number): Promise<void> {
    if (id < 1) throw new BadRequestException('id inválido.');
    await this.service.deleteHoliday(id);
  }
}

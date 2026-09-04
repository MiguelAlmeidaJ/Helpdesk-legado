import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppPermission,
  type CreateVehicleAgendaScheduleRequest,
  type DuplicateVehicleAgendaScheduleRequest,
  type MoveVehicleAgendaScheduleRequest,
  type UpdateVehicleAgendaScheduleRequest,
  type UpsertVehicleAgendaVehicleRequest,
  type VehicleAgendaResponse,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { VehicleAgendaService } from '../../application/vehicle-agenda.service';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function integer(value: unknown, field: string, minimum = 1): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new BadRequestException(`${field} é inválido.`);
  }
  return parsed;
}

function optionalNumber(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new BadRequestException(`${field} é inválido.`);
  }
  return parsed;
}

function text(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} é obrigatório.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > max) {
    throw new BadRequestException(`${field} é inválido.`);
  }
  return normalized;
}

function date(value: unknown): string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new BadRequestException('date é inválida.');
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw new BadRequestException('date é inválida.');
  }
  return value;
}

function time(value: unknown): string {
  if (typeof value !== 'string' || !TIME_PATTERN.test(value)) {
    throw new BadRequestException('time é inválido.');
  }
  return value;
}

function visibility(value: unknown): 0 | 1 {
  if (value === 0 || value === '0') return 0;
  if (value === 1 || value === '1') return 1;
  throw new BadRequestException('visibility é inválida.');
}

function color(value: unknown): number {
  const parsed = integer(value, 'color');
  if (parsed > 18) throw new BadRequestException('color é inválida.');
  return parsed;
}

function scheduleBody(
  body: unknown,
  includeArchived: false,
): CreateVehicleAgendaScheduleRequest;
function scheduleBody(
  body: unknown,
  includeArchived: true,
): UpdateVehicleAgendaScheduleRequest;
function scheduleBody(
  body: unknown,
  includeArchived: boolean,
): CreateVehicleAgendaScheduleRequest | UpdateVehicleAgendaScheduleRequest {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  const value = body as Record<string, unknown>;
  const base: CreateVehicleAgendaScheduleRequest = {
    vehicleId: integer(value.vehicleId, 'vehicleId'),
    date: date(value.date),
    clientId: integer(value.clientId, 'clientId'),
    destination: text(value.destination, 'destination', 180),
    time: time(value.time),
    driverId: integer(value.driverId, 'driverId'),
    notes:
      value.notes === undefined || value.notes === ''
        ? ''
        : text(value.notes, 'notes', 5000),
    initialKm: optionalNumber(value.initialKm, 'initialKm'),
    finalKm: optionalNumber(value.finalKm, 'finalKm'),
    visibility: visibility(value.visibility),
    color: color(value.color),
  };

  if (!includeArchived) return base;
  if (typeof value.archived !== 'boolean') {
    throw new BadRequestException('archived é obrigatório.');
  }
  return { ...base, archived: value.archived };
}

function moveBody(body: unknown): MoveVehicleAgendaScheduleRequest {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  const value = body as Record<string, unknown>;
  return {
    vehicleId: integer(value.vehicleId, 'vehicleId'),
    date: date(value.date),
  };
}

function vehicleBody(body: unknown): UpsertVehicleAgendaVehicleRequest {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  const value = body as Record<string, unknown>;
  if (typeof value.active !== 'boolean') {
    throw new BadRequestException('active é obrigatório.');
  }
  return {
    name: text(value.name, 'name', 120),
    plate: text(value.plate, 'plate', 30),
    active: value.active,
  };
}

function hasPermission(user: AuthenticatedUser, permission: AppPermission): boolean {
  return user.grants.some((grant) => grant.permission === permission);
}

@ApiTags('logistics')
@Controller('logistics/vehicles/agenda')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.LogisticsVehicleAgendaRead)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class VehicleAgendaController {
  constructor(private readonly agenda: VehicleAgendaService) {}

  @Get()
  @ApiOperation({ summary: 'Agenda mensal de veículos' })
  async get(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('month') monthValue?: string,
    @Query('year') yearValue?: string,
  ): Promise<VehicleAgendaResponse> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');

    const now = new Date();
    const month = monthValue ? integer(monthValue, 'month') : now.getMonth() + 1;
    const year = yearValue ? integer(yearValue, 'year', 2000) : now.getFullYear();
    if (month > 12 || year > 2100) {
      throw new BadRequestException('Mês ou ano inválido.');
    }

    return this.agenda.get(
      user,
      month,
      year,
      hasPermission(user, AppPermission.LogisticsVehicleAgendaManage),
    );
  }

  @Post('schedules')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.LogisticsVehicleAgendaManage)
  createSchedule(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.agenda.createSchedule(user, scheduleBody(body, false));
  }

  @Patch('schedules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.LogisticsVehicleAgendaManage)
  updateSchedule(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.agenda.updateSchedule(user, id, scheduleBody(body, true));
  }

  @Delete('schedules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.LogisticsVehicleAgendaManage)
  deleteSchedule(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.agenda.deleteSchedule(id);
  }

  @Post('schedules/:id/move')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.LogisticsVehicleAgendaManage)
  moveSchedule(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.agenda.moveSchedule(user, id, moveBody(body));
  }

  @Post('schedules/:id/duplicate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.LogisticsVehicleAgendaManage)
  duplicateSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<void> {
    return this.agenda.duplicateSchedule(id, moveBody(body));
  }

  @Post('undo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.LogisticsVehicleAgendaManage)
  undo(@CurrentUser() user: AuthenticatedUser | undefined): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.agenda.undo(user.id);
  }

  @Post('vehicles')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.LogisticsVehicleAgendaManage)
  createVehicle(@Body() body: unknown): Promise<void> {
    return this.agenda.createVehicle(vehicleBody(body));
  }

  @Patch('vehicles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.LogisticsVehicleAgendaManage)
  updateVehicle(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<void> {
    return this.agenda.updateVehicle(id, vehicleBody(body));
  }

  @Delete('vehicles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.LogisticsVehicleAgendaManage)
  deleteVehicle(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.agenda.deleteVehicle(id);
  }
}

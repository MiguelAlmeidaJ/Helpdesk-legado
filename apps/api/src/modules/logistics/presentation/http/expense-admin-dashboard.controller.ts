import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppPermission,
  type LogisticsExpenseAdminGroup,
  type LogisticsExpenseAdminStatus,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { ExpenseAdminDashboardService } from '../../application/expense-admin-dashboard.service';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dateParam(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!DATE_PATTERN.test(value)) {
    throw new BadRequestException('Data inválida. Use YYYY-MM-DD.');
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new BadRequestException('Data inválida. Use YYYY-MM-DD.');
  }

  return value;
}

function periodParams(
  rawStartDate: string | undefined,
  rawEndDate: string | undefined,
): { startDate?: string; endDate?: string } {
  const startDate = dateParam(rawStartDate);
  const endDate = dateParam(rawEndDate);

  if (startDate && endDate && startDate > endDate) {
    throw new BadRequestException('A data inicial deve ser anterior à final.');
  }

  return { startDate, endDate };
}

function statusParam(value: string | undefined): LogisticsExpenseAdminStatus {
  if (!value) return 4;
  const status = Number(value);
  if (status === 1 || status === 2 || status === 4) return status;
  throw new BadRequestException('Status inválido. Use 1, 2 ou 4.');
}

function groupParam(value: string | undefined): LogisticsExpenseAdminGroup {
  if (value === 'category' || value === 'client' || value === 'collaborator') {
    return value;
  }
  throw new BadRequestException(
    'Agrupamento inválido. Use category, client ou collaborator.',
  );
}

function detailKey(
  group: LogisticsExpenseAdminGroup,
  value: string | undefined,
): string {
  if (value === undefined) {
    throw new BadRequestException('Identificador do agrupamento é obrigatório.');
  }

  if (group === 'collaborator') {
    const normalized = value.trim();
    const id = Number(normalized);
    if (!/^\d+$/.test(normalized) || !Number.isSafeInteger(id) || id <= 0) {
      throw new BadRequestException('Colaborador inválido.');
    }
    return String(id);
  }

  return value;
}

@ApiTags('logistics-expenses')
@Controller('logistics/expenses/admin')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class ExpenseAdminDashboardController {
  constructor(private readonly dashboard: ExpenseAdminDashboardService) {}

  @Get('summary')
  @RequirePermissions(AppPermission.LogisticsExpensesAdminRead)
  @ApiOperation({ summary: 'Consultar painel administrativo de RD' })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-09-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-09-30' })
  @ApiQuery({ name: 'status', required: false, enum: [1, 2, 4] })
  async summary(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('startDate') rawStartDate?: string,
    @Query('endDate') rawEndDate?: string,
    @Query('status') rawStatus?: string,
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    const period = periodParams(rawStartDate, rawEndDate);

    return this.dashboard.summary(
      period.startDate,
      period.endDate,
      statusParam(rawStatus),
    );
  }

  @Get('details')
  @RequirePermissions(AppPermission.LogisticsExpensesAdminRead)
  @ApiOperation({ summary: 'Detalhar agrupamento do painel administrativo de RD' })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-09-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-09-30' })
  @ApiQuery({ name: 'status', required: false, enum: [1, 2, 4] })
  @ApiQuery({
    name: 'group',
    required: true,
    enum: ['category', 'client', 'collaborator'],
  })
  @ApiQuery({ name: 'key', required: true })
  async details(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('group') rawGroup?: string,
    @Query('key') rawKey?: string,
    @Query('startDate') rawStartDate?: string,
    @Query('endDate') rawEndDate?: string,
    @Query('status') rawStatus?: string,
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    const period = periodParams(rawStartDate, rawEndDate);
    const group = groupParam(rawGroup);

    return this.dashboard.details({
      ...period,
      status: statusParam(rawStatus),
      group,
      key: detailKey(group, rawKey),
    });
  }
}

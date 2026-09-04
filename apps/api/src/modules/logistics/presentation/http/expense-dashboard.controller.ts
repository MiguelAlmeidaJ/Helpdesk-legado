import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  AppPermission,
  type LogisticsExpenseDashboardResponse,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { ExpenseDashboardService } from '../../application/expense-dashboard.service';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function optionalDate(
  value: string | undefined,
  field: string,
): string | undefined {
  if (value === undefined || value === '') return undefined;

  if (!DATE_PATTERN.test(value)) {
    throw new BadRequestException(`${field} deve usar o formato YYYY-MM-DD.`);
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
    throw new BadRequestException(`${field} deve ser uma data válida.`);
  }

  return value;
}

@ApiTags('logistics')
@Controller('logistics/expenses/dashboard')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.LogisticsExpensesRead)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class ExpenseDashboardController {
  constructor(private readonly dashboard: ExpenseDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Painel pessoal de despesas/RD' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  get(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<LogisticsExpenseDashboardResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return this.dashboard.get({
      userId: user.id,
      userName: user.name,
      startDate: optionalDate(startDate, 'startDate'),
      endDate: optionalDate(endDate, 'endDate'),
    });
  }
}

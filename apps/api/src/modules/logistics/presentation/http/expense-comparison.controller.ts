import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AppPermission, PermissionScope } from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { ExpenseComparisonService } from '../../application/expense-comparison.service';

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

function period(
  rawStart: string | undefined,
  rawEnd: string | undefined,
  label: string,
): { start?: string; end?: string } {
  const start = dateParam(rawStart);
  const end = dateParam(rawEnd);
  if ((start && !end) || (!start && end)) {
    throw new BadRequestException(`${label}: informe a data inicial e a data final.`);
  }
  if (start && end && start > end) {
    throw new BadRequestException(`${label}: a data inicial deve ser anterior à final.`);
  }
  return { start, end };
}

function comparisonScope(user: AuthenticatedUser): PermissionScope {
  if (user.grants.some((grant) => grant.permission === AppPermission.SystemAdmin)) {
    return PermissionScope.All;
  }
  const grant = user.grants.find(
    (candidate) => candidate.permission === AppPermission.LogisticsExpensesAdminRead,
  );
  return grant?.scope === PermissionScope.All ? PermissionScope.All : PermissionScope.Own;
}

@ApiTags('logistics-expenses')
@Controller('logistics/expenses/admin/analysis')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class ExpenseComparisonController {
  constructor(private readonly service: ExpenseComparisonService) {}

  @Get()
  @RequirePermissions(AppPermission.LogisticsExpensesAdminRead)
  @ApiOperation({ summary: 'Comparar despesas pagas entre dois períodos' })
  @ApiQuery({ name: 'period1Start', required: false, example: '2026-08-01' })
  @ApiQuery({ name: 'period1End', required: false, example: '2026-08-31' })
  @ApiQuery({ name: 'period2Start', required: false, example: '2026-09-01' })
  @ApiQuery({ name: 'period2End', required: false, example: '2026-09-30' })
  compare(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('period1Start') rawPeriod1Start?: string,
    @Query('period1End') rawPeriod1End?: string,
    @Query('period2Start') rawPeriod2Start?: string,
    @Query('period2End') rawPeriod2End?: string,
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    const period1 = period(rawPeriod1Start, rawPeriod1End, 'Período 1');
    const period2 = period(rawPeriod2Start, rawPeriod2End, 'Período 2');
    return this.service.compare({
      period1Start: period1.start,
      period1End: period1.end,
      period2Start: period2.start,
      period2End: period2.end,
      actorUserId: user.id,
      scope: comparisonScope(user),
    });
  }
}

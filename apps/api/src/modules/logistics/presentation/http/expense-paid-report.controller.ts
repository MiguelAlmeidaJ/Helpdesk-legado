import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  AppPermission,
  PermissionScope,
  type UpdateLogisticsExpensePaidAdminRequest,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { ExpensePaidReportService } from '../../application/expense-paid-report.service';

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

function positiveInteger(value: string | undefined, label: string): number | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  const parsed = Number(normalized);
  if (!/^\d+$/.test(normalized) || !Number.isSafeInteger(parsed) || parsed < 1) {
    throw new BadRequestException(`${label} inválido.`);
  }
  return parsed;
}

function clientName(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (normalized.length > 255) {
    throw new BadRequestException('Cliente deve ter no máximo 255 caracteres.');
  }
  return normalized || undefined;
}

function categoryIds(value: string | string[] | undefined): number[] {
  if (value === undefined) return [];
  const raw = (Array.isArray(value) ? value : [value]).flatMap((entry) =>
    entry.split(','),
  );
  if (raw.length > 100) {
    throw new BadRequestException('Informe no máximo 100 categorias.');
  }
  const ids = raw
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => positiveInteger(entry, 'Categoria'))
    .filter((entry): entry is number => entry !== undefined);
  return [...new Set(ids)];
}

function period(
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

function reportScope(user: AuthenticatedUser): PermissionScope {
  if (
    user.grants.some((grant) => grant.permission === AppPermission.SystemAdmin)
  ) {
    return PermissionScope.All;
  }
  const grant = user.grants.find(
    (candidate) =>
      candidate.permission === AppPermission.LogisticsExpensesAdminRead,
  );
  return grant?.scope === PermissionScope.All
    ? PermissionScope.All
    : PermissionScope.Own;
}

function requireAdminManageAll(user: AuthenticatedUser): void {
  if (
    user.grants.some((grant) => grant.permission === AppPermission.SystemAdmin)
  ) {
    return;
  }
  const grant = user.grants.find(
    (candidate) =>
      candidate.permission === AppPermission.LogisticsExpensesAdminManage,
  );
  if (grant?.scope !== PermissionScope.All) {
    throw new ForbiddenException(
      'A edição administrativa de RD exige escopo total.',
    );
  }
}

function bodyInteger(
  value: unknown,
  field: string,
  nullable = false,
): number | null {
  if (nullable && (value === null || value === undefined || value === '')) {
    return null;
  }
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new BadRequestException(`${field} inválido.`);
  }
  return parsed;
}

function bodyText(
  value: unknown,
  field: string,
  maximum: number,
): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} inválido.`);
  }
  const normalized = value.trim();
  if (normalized.length > maximum) {
    throw new BadRequestException(
      `${field} deve ter no máximo ${maximum} caracteres.`,
    );
  }
  return normalized;
}

function editBody(value: unknown): UpdateLogisticsExpensePaidAdminRequest {
  if (!value || typeof value !== 'object') {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  const body = value as Record<string, unknown>;
  const amount = Number(body.amount);
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 99_999_999.99
  ) {
    throw new BadRequestException('amount inválido.');
  }

  return {
    amount,
    categoryId: bodyInteger(body.categoryId, 'categoryId') as number,
    clientId: bodyInteger(body.clientId, 'clientId', true),
    pixTypeId: bodyInteger(body.pixTypeId, 'pixTypeId', true),
    pix: bodyText(body.pix, 'pix', 255),
    remarks: bodyText(body.remarks, 'remarks', 5000),
  };
}

@ApiTags('logistics-expenses')
@Controller('logistics/expenses/admin/report')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class ExpensePaidReportController {
  constructor(private readonly reportService: ExpensePaidReportService) {}

  @Get()
  @RequirePermissions(AppPermission.LogisticsExpensesAdminRead)
  @ApiOperation({ summary: 'Consultar relatório de RDs pagas' })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-09-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-09-30' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'clientName', required: false, type: String })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    isArray: true,
    type: Number,
  })
  report(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('startDate') rawStartDate?: string,
    @Query('endDate') rawEndDate?: string,
    @Query('userId') rawUserId?: string,
    @Query('clientName') rawClientName?: string,
    @Query('categoryId') rawCategoryIds?: string | string[],
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    const scope = reportScope(user);
    const requestedUserId = positiveInteger(rawUserId, 'Colaborador');
    if (
      scope !== PermissionScope.All &&
      requestedUserId !== undefined &&
      requestedUserId !== user.id
    ) {
      throw new ForbiddenException('O relatório está limitado às suas despesas.');
    }

    return this.reportService.report({
      ...period(rawStartDate, rawEndDate),
      actorUserId: user.id,
      scope,
      userId: requestedUserId,
      clientName: clientName(rawClientName),
      categoryIds: categoryIds(rawCategoryIds),
    });
  }

  @Get(':id/edit')
  @RequirePermissions(AppPermission.LogisticsExpensesAdminManage)
  @ApiOperation({ summary: 'Carregar uma RD paga para edição administrativa' })
  edit(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) expenseId: number,
  ) {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    requireAdminManageAll(user);
    return this.reportService.edit(expenseId);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.LogisticsExpensesAdminManage)
  @ApiOperation({ summary: 'Editar dados administrativos de uma RD paga' })
  update(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) expenseId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    requireAdminManageAll(user);
    return this.reportService.update(expenseId, editBody(body));
  }
}

import { BadRequestException, Controller, Get, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AppPermission, type TicketAnalyticsFilters, type TicketReportSource } from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { GetTicketAnalytics } from '../../application/get-ticket-analytics';
import { parseReportQuery } from './report-query';

export function reportId(value: unknown, name: string): number {
  if (value === undefined || value === '') return 0;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new BadRequestException(`${name} deve ser um inteiro positivo.`);
  return Number(value);
}

export function analyticsFilters(query: Record<string, unknown>): TicketAnalyticsFilters {
  const source = query.source ?? 'tickets';
  if (typeof source !== 'string' || !['tickets', 'tasks', 'improvements', 'unified'].includes(source)) throw new BadRequestException('source inválido.');
  for (const field of ['startDate', 'endDate']) {
    if (query[field] !== undefined && typeof query[field] !== 'string') throw new BadRequestException(`${field} inválido.`);
  }
  const dates = parseReportQuery(query.startDate as string | undefined, query.endDate as string | undefined);
  const level = reportId(query.level, 'level');
  if (level > 5) throw new BadRequestException('level deve estar entre 0 e 5.');
  return { startDate: dates.startDate, endDate: dates.endDate, source: source as TicketReportSource, level,
    clientId: reportId(query.clientId, 'clientId'), locationId: reportId(query.locationId, 'locationId'), technicianId: reportId(query.technicianId, 'technicianId') };
}

export function reportUser(user: AuthenticatedUser | undefined): number {
  if (!user) throw new UnauthorizedException('Usuário não autenticado.');
  return user.id;
}

@ApiTags('reports')
@Controller('reports/tickets')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsAudit)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketAnalyticsController {
  constructor(private readonly reports: GetTicketAnalytics) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Relatório analítico de atendimentos, tarefas e melhorias' })
  analytics(@CurrentUser() user: AuthenticatedUser | undefined, @Query() query: Record<string, unknown>) {
    return this.reports.analytics(reportUser(user), analyticsFilters(query));
  }

  @Get('catalog')
  @ApiOperation({ summary: 'Clientes, locais e técnicos disponíveis para relatórios' })
  catalog(@CurrentUser() user: AuthenticatedUser | undefined, @Query('clientId') clientId?: string) {
    return this.reports.catalog(reportUser(user), reportId(clientId, 'clientId'));
  }

  @Get('workload')
  @ApiOperation({ summary: 'Atendimentos abertos, em espera, vencidos e tempo por técnico' })
  workload(@CurrentUser() user: AuthenticatedUser | undefined) { return this.reports.workload(reportUser(user)); }
}

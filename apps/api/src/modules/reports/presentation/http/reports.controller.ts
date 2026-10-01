import {
  BadRequestException,
  Controller,
  Get,
  Param,
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
  type TicketBreakdownMode,
  type TicketBreakdownReportResponse,
  type TicketCategoryTotalsReportResponse,
  type TicketClientTotalsReportResponse,
  type TicketTechnicianTotalsReportResponse,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { TicketBreakdownReportService } from '../../application/ticket-breakdown-report.service';
import { GetTicketCategoryTotalsReport } from '../../application/get-ticket-category-totals-report';
import { GetTicketClientTotalsReport } from '../../application/get-ticket-client-totals-report';
import { GetTicketTechnicianTotalsReport } from '../../application/get-ticket-technician-totals-report';

import { parseReportQuery } from './report-query';

function optionalReportIds(value: string | undefined, field: string): number[] {
  if (!value) return [];
  const raw = [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
  if (raw.length > 100) {
    throw new BadRequestException(`${field} aceita no máximo 100 valores.`);
  }
  return raw.map((item) => {
    if (!/^\d+$/.test(item) || !Number.isSafeInteger(Number(item)) || Number(item) < 1) {
      throw new BadRequestException(`${field} deve conter apenas inteiros positivos.`);
    }
    return Number(item);
  });
}

function optionalReportId(value: string | undefined, field: string): number {
  if (!value) return 0;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new BadRequestException(`${field} deve ser um inteiro positivo.`);
  }
  return Number(value);
}

@ApiTags('reports')
@Controller('reports')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.ReportsRead)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class ReportsController {
  constructor(
    private readonly ticketBreakdownReport: TicketBreakdownReportService,
    private readonly getTicketCategoryTotalsReport: GetTicketCategoryTotalsReport,
    private readonly getTicketClientTotalsReport: GetTicketClientTotalsReport,
    private readonly getTicketTechnicianTotalsReport: GetTicketTechnicianTotalsReport,
  ) {}


  @Get('tickets/breakdown/:mode')
  @ApiOperation({ summary: 'Relatório agrupado diário ou por solicitante' })
  getTicketBreakdown(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('mode') modeValue: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('level') level?: string,
    @Query('clientId') clientId?: string,
    @Query('clientIds') clientIds?: string,
    @Query('technicianId') technicianId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
  ): Promise<TicketBreakdownReportResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const modes: TicketBreakdownMode[] = [
      'client-daily',
      'requester',
      'technician-daily',
    ];
    if (!modes.includes(modeValue as TicketBreakdownMode)) {
      throw new BadRequestException('Modo de relatório inválido.');
    }

    const query = parseReportQuery(startDate, endDate, level);
    return this.ticketBreakdownReport.get({
      userId: user.id,
      mode: modeValue as TicketBreakdownMode,
      ...query,
      clientId: optionalReportId(clientId, 'clientId'),
      clientIds: optionalReportIds(clientIds, 'clientIds'),
      technicianId: optionalReportId(technicianId, 'technicianId'),
      categoryId: optionalReportId(categoryId, 'categoryId'),
      status: optionalReportId(status, 'status'),
    });
  }

  @Get('tickets/category-totals')
  @ApiOperation({
    summary: 'Total de atendimentos por categoria',
    description:
      'Migração nativa de rel/atd_total_por_categoria.php, com período, nível e escopo de clientes do usuário.',
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: [0, 1, 2, 3],
    description: '0 considera níveis 1, 2 e 3.',
  })
  getTicketCategoryTotals(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('level') level?: string,
    @Query('clientId') clientId?: string,
    @Query('clientIds') clientIds?: string,
    @Query('technicianId') technicianId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
  ): Promise<TicketCategoryTotalsReportResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const query = parseReportQuery(startDate, endDate, level);

    return this.getTicketCategoryTotalsReport.execute({
      userId: user.id,
      ...query,
      clientId: optionalReportId(clientId, 'clientId'),
      clientIds: optionalReportIds(clientIds, 'clientIds'),
      technicianId: optionalReportId(technicianId, 'technicianId'),
      categoryId: optionalReportId(categoryId, 'categoryId'),
      status: optionalReportId(status, 'status'),
    });
  }

  @Get('tickets/client-totals')
  @ApiOperation({
    summary: 'Total de atendimentos por cliente',
    description:
      'Migração nativa de rel/atd_total_por_cliente.php, com período, nível e escopo de clientes do usuário.',
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: [0, 1, 2, 3],
    description: '0 considera níveis 1, 2 e 3.',
  })
  getTicketClientTotals(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('level') level?: string,
    @Query('clientId') clientId?: string,
    @Query('clientIds') clientIds?: string,
    @Query('technicianId') technicianId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
  ): Promise<TicketClientTotalsReportResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const query = parseReportQuery(startDate, endDate, level);

    return this.getTicketClientTotalsReport.execute({
      userId: user.id,
      ...query,
      clientId: optionalReportId(clientId, 'clientId'),
      clientIds: optionalReportIds(clientIds, 'clientIds'),
      technicianId: optionalReportId(technicianId, 'technicianId'),
      categoryId: optionalReportId(categoryId, 'categoryId'),
      status: optionalReportId(status, 'status'),
    });
  }

  @Get('tickets/technician-totals')
  @ApiOperation({
    summary: 'Total de atendimentos por técnico',
    description:
      'Migração nativa de rel/atd_total_por_tecnico.php, com período, nível e escopo de clientes do usuário.',
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: [0, 1, 2, 3],
    description: '0 considera níveis 1, 2 e 3.',
  })
  getTicketTechnicianTotals(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('level') level?: string,
    @Query('clientId') clientId?: string,
    @Query('clientIds') clientIds?: string,
    @Query('technicianId') technicianId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
  ): Promise<TicketTechnicianTotalsReportResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const query = parseReportQuery(startDate, endDate, level);

    return this.getTicketTechnicianTotalsReport.execute({
      userId: user.id,
      ...query,
      clientId: optionalReportId(clientId, 'clientId'),
      clientIds: optionalReportIds(clientIds, 'clientIds'),
      technicianId: optionalReportId(technicianId, 'technicianId'),
      categoryId: optionalReportId(categoryId, 'categoryId'),
      status: optionalReportId(status, 'status'),
    });
  }
}

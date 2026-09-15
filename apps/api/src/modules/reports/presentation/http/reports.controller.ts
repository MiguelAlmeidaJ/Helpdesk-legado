import {
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
import { GetTicketCategoryTotalsReport } from '../../application/get-ticket-category-totals-report';
import { GetTicketClientTotalsReport } from '../../application/get-ticket-client-totals-report';
import { GetTicketTechnicianTotalsReport } from '../../application/get-ticket-technician-totals-report';

import { parseReportQuery } from './report-query';

@ApiTags('reports')
@Controller('reports')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsAudit)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class ReportsController {
  constructor(
    private readonly getTicketCategoryTotalsReport: GetTicketCategoryTotalsReport,
    private readonly getTicketClientTotalsReport: GetTicketClientTotalsReport,
    private readonly getTicketTechnicianTotalsReport: GetTicketTechnicianTotalsReport,
  ) {}

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
  ): Promise<TicketCategoryTotalsReportResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const query = parseReportQuery(startDate, endDate, level);

    return this.getTicketCategoryTotalsReport.execute({
      userId: user.id,
      ...query,
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
  ): Promise<TicketClientTotalsReportResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const query = parseReportQuery(startDate, endDate, level);

    return this.getTicketClientTotalsReport.execute({
      userId: user.id,
      ...query,
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
  ): Promise<TicketTechnicianTotalsReportResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const query = parseReportQuery(startDate, endDate, level);

    return this.getTicketTechnicianTotalsReport.execute({
      userId: user.id,
      ...query,
    });
  }
}

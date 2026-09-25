import {
  Controller,
  Get,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiProduces,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppPermission,
  type TicketAvailabilityResponse,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { GetTicketAvailability } from '../../application/get-ticket-availability';
import { buildWaitingTicketsPdf } from '../../infrastructure/report/waiting-tickets-pdf';

@ApiTags('tickets')
@Controller('tickets/availability')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsAudit)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketAvailabilityController {
  constructor(private readonly availability: GetTicketAvailability) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Disponibilidade técnica de atendimentos' })
  dashboard(): Promise<TicketAvailabilityResponse> {
    return this.availability.execute();
  }

  @Get('waiting-report.pdf')
  @ApiProduces('application/pdf')
  @ApiOperation({ summary: 'Relatório PDF dos atendimentos em espera' })
  async waitingReport(): Promise<StreamableFile> {
    const dashboard = await this.availability.execute();
    const pdf = buildWaitingTicketsPdf(dashboard);
    const stamp = dashboard.generatedAt
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replace('T', '_');

    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="relatorio_atendimentos_em_espera_${stamp}.pdf"`,
    });
  }
}

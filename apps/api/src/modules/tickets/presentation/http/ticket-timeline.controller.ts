import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AppPermission, type TicketTimelineResponse } from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { GetTicketTimeline } from '../../application/get-ticket-timeline';

@ApiTags('tickets')
@Controller('tickets/audit')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsAudit)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketTimelineController {
  constructor(private readonly timeline: GetTicketTimeline) {}

  @Get('timeline')
  @ApiOperation({ summary: 'Timeline global de atendimentos das últimas 24 horas' })
  list(
    @Query('limit', new DefaultValuePipe(200), ParseIntPipe) limit: number,
  ): Promise<TicketTimelineResponse> {
    return this.timeline.execute(limit);
  }
}

import {
  BadRequestException,
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

function validDate(value: string | undefined): string {
  if (!value) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('date deve estar no formato YYYY-MM-DD.');
  }
  return value;
}

@ApiTags('tickets')
@Controller('tickets/audit')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsAudit)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketTimelineController {
  constructor(private readonly timeline: GetTicketTimeline) {}

  @Get('timeline')
  @ApiOperation({ summary: 'Timeline diária de interações por técnico' })
  list(
    @Query('technicianId') technicianIdValue?: string,
    @Query('date') dateValue?: string,
    @Query('limit', new DefaultValuePipe(500), ParseIntPipe) limit = 500,
  ): Promise<TicketTimelineResponse> {
    const technicianId = technicianIdValue ? Number(technicianIdValue) : null;
    if (
      technicianId !== null &&
      (!Number.isSafeInteger(technicianId) || technicianId < 1)
    ) {
      throw new BadRequestException('technicianId inválido.');
    }

    return this.timeline.execute(technicianId, validDate(dateValue), limit);
  }
}

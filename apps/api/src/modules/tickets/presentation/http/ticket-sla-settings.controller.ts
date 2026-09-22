import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  AppPermission,
  type TicketSlaSettings,
  type UpdateTicketSlaSettingsRequest,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { TicketSlaSettingsService } from '../../application/ticket-sla-settings.service';

function parseMinutes(value: unknown, field: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 10_080
  ) {
    throw new BadRequestException(
      `${field} deve ser um inteiro entre 1 e 10080 minutos.`,
    );
  }
  return value;
}

function input(body: unknown): UpdateTicketSlaSettingsRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Corpo da requisição é inválido.');
  }
  const value = body as Record<string, unknown>;
  return {
    qualityMinutes: parseMinutes(value.qualityMinutes, 'qualityMinutes'),
    clerioMinutes: parseMinutes(value.clerioMinutes, 'clerioMinutes'),
  };
}

@ApiTags('ticket-sla-settings')
@Controller('administration/ticket-sla')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.SystemAdmin)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketSlaSettingsController {
  constructor(private readonly settings: TicketSlaSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtém as configurações de SLA dos atendimentos' })
  get(): Promise<TicketSlaSettings> {
    return this.settings.get();
  }

  @Patch()
  @ApiOperation({ summary: 'Atualiza os SLAs Qualidade e Clerio' })
  update(@Body() body: unknown): Promise<TicketSlaSettings> {
    return this.settings.update(input(body));
  }
}

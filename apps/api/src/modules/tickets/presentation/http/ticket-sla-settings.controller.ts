import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  AppPermission,
  type SaveTicketSlaRuleRequest,
  type TicketSlaPolicyResponse,
  type TicketSlaRule,
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

function optionalId(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new BadRequestException(`${field} deve ser um inteiro positivo.`);
  }
  return value;
}

function optionalPriority(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 4) {
    throw new BadRequestException('priority deve ser um inteiro entre 0 e 4.');
  }
  return value;
}

function ruleInput(body: unknown): SaveTicketSlaRuleRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Corpo da regra é inválido.');
  }
  const value = body as Record<string, unknown>;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name || name.length > 120) {
    throw new BadRequestException('name deve ter entre 1 e 120 caracteres.');
  }
  const sortOrder = value.sortOrder;
  if (typeof sortOrder !== 'number' || !Number.isSafeInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) {
    throw new BadRequestException('sortOrder deve ser um inteiro entre 0 e 9999.');
  }
  if (typeof value.active !== 'boolean') {
    throw new BadRequestException('active deve ser booleano.');
  }

  return {
    name,
    clientId: optionalId(value.clientId, 'clientId'),
    categoryId: optionalId(value.categoryId, 'categoryId'),
    priority: optionalPriority(value.priority),
    qualityMinutes: parseMinutes(value.qualityMinutes, 'qualityMinutes'),
    clerioMinutes: parseMinutes(value.clerioMinutes, 'clerioMinutes'),
    active: value.active,
    sortOrder,
  };
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

  @Get('policy')
  @ApiOperation({ summary: 'Lista a política e as regras hierárquicas de SLA' })
  policy(): Promise<TicketSlaPolicyResponse> {
    return this.settings.policy();
  }

  @Post('rules')
  @ApiOperation({ summary: 'Cria uma regra de SLA' })
  createRule(@Body() body: unknown): Promise<TicketSlaRule> {
    return this.settings.createRule(ruleInput(body));
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Atualiza uma regra de SLA' })
  updateRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<TicketSlaRule> {
    return this.settings.updateRule(id, ruleInput(body));
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Exclui uma regra de SLA' })
  async deleteRule(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.settings.deleteRule(id);
  }
}

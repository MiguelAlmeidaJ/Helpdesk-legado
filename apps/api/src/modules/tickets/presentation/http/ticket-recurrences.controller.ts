import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  AppPermission,
  type TicketRecurrenceListResponse,
  type TicketRecurrenceMutationRequest,
  type TicketRecurrenceMutationResponse,
  type TicketRecurrencePeriod,
  type TicketRecurrenceStatusFilter,
  type TicketRecurrenceToggleRequest,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { ManageTicketRecurrences } from '../../application/manage-ticket-recurrences';
import { normalizeLegacyLocalDateTime } from '../../domain/legacy-local-date-time';

const PERIODS = new Set([1, 2, 3, 4, 5, 6, 7, 8]);

function positiveInteger(value: unknown, field: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new BadRequestException(`${field} deve ser um inteiro positivo.`);
  return parsed;
}

function parseMutation(body: unknown): TicketRecurrenceMutationRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Corpo da requisição inválido.');
  const value = body as Record<string, unknown>;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name || name.length > 180) throw new BadRequestException('name deve ter entre 1 e 180 caracteres.');
  const clientId = positiveInteger(value.clientId, 'clientId');
  const period = positiveInteger(value.period, 'period');
  if (!PERIODS.has(period)) throw new BadRequestException('period é inválido.');
  const nextAt = typeof value.nextAt === 'string' ? normalizeLegacyLocalDateTime(value.nextAt) : null;
  if (!nextAt) throw new BadRequestException('nextAt deve usar YYYY-MM-DDTHH:mm sem conversão de fuso.');
  const quantityMode = value.quantityMode === 'continua' ? 'continua' : value.quantityMode === 'fixa' ? 'fixa' : null;
  if (!quantityMode) throw new BadRequestException('quantityMode deve ser fixa ou continua.');
  let quantity: number | null = null;
  if (quantityMode === 'fixa') {
    quantity = positiveInteger(value.quantity, 'quantity');
    if (quantity > 31) throw new BadRequestException('quantity deve ser no máximo 31.');
  }
  return { name, clientId, period: period as TicketRecurrencePeriod, nextAt: nextAt.slice(0, 16), quantityMode, quantity };
}

@ApiTags('tickets')
@Controller('tickets/recurrences')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketRecurrencesController {
  constructor(private readonly manager: ManageTicketRecurrences) {}

  @Get()
  @RequirePermissions(AppPermission.TicketsRead)
  @ApiOperation({ summary: 'Listar recorrências de atendimentos' })
  list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('clientId') clientRaw?: string,
    @Query('period') periodRaw?: string,
    @Query('status') statusRaw?: string,
  ): Promise<TicketRecurrenceListResponse> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    const clientId = clientRaw ? positiveInteger(clientRaw, 'clientId') : undefined;
    const period = periodRaw ? positiveInteger(periodRaw, 'period') : undefined;
    if (period !== undefined && !PERIODS.has(period)) throw new BadRequestException('period é inválido.');
    const status: TicketRecurrenceStatusFilter = statusRaw === 'todos' || statusRaw === 'inativas' ? statusRaw : 'ativas';
    return this.manager.list(user.id, { clientId, period, status });
  }

  @Post()
  @RequirePermissions(AppPermission.TicketsCreate)
  @ApiOperation({ summary: 'Cadastrar recorrência' })
  create(@CurrentUser() user: AuthenticatedUser | undefined, @Body() body: unknown): Promise<TicketRecurrenceMutationResponse> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.manager.create(user.id, parseMutation(body));
  }

  @Put(':id')
  @RequirePermissions(AppPermission.TicketsEdit)
  @ApiOperation({ summary: 'Editar recorrência' })
  async update(@CurrentUser() user: AuthenticatedUser | undefined, @Param('id', ParseIntPipe) id: number, @Body() body: unknown): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    await this.manager.update(user.id, id, parseMutation(body));
  }

  @Patch(':id/active')
  @RequirePermissions(AppPermission.TicketsEdit)
  @ApiOperation({ summary: 'Ativar ou desativar recorrência' })
  async active(@CurrentUser() user: AuthenticatedUser | undefined, @Param('id', ParseIntPipe) id: number, @Body() body: TicketRecurrenceToggleRequest): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    if (!body || typeof body.active !== 'boolean') throw new BadRequestException('active deve ser booleano.');
    await this.manager.setActive(user.id, id, body.active);
  }
}

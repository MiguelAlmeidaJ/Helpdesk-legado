import { BadRequestException, Body, Controller, Get, ParseIntPipe, Post, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AppPermission, type CreateTicketRequest, type CreateTicketResponse, type TicketCatalogOption, type TicketCreateCatalogsResponse } from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { CreateTicket } from '../../application/create-ticket';
import { TICKET_FORMS, TICKET_LEVELS, TICKET_PRIORITIES, TICKET_TYPES } from '../../application/get-ticket-classification-catalogs';

function integer(value: unknown, field: string, allowZero = false): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new BadRequestException(`${field} deve ser um inteiro ${allowZero ? 'não negativo' : 'positivo'}.`);
  }
  return value;
}

function catalogId(value: unknown, field: string, options: TicketCatalogOption[]): number {
  const id = integer(value, field, true);
  if (!options.some((option) => option.id === id)) throw new BadRequestException(`${field} é inválido.`);
  return id;
}

function parseRequest(body: unknown): CreateTicketRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Corpo da requisição inválido.');
  const value = body as Record<string, unknown>;
  const openingDescription = typeof value.openingDescription === 'string' ? value.openingDescription.trim() : '';
  if (!openingDescription || openingDescription.length > 10_000) throw new BadRequestException('openingDescription deve ter entre 1 e 10000 caracteres.');
  if (typeof value.openingAt !== 'string' || Number.isNaN(new Date(value.openingAt).getTime())) throw new BadRequestException('openingAt deve ser uma data válida.');
  let recurrence: CreateTicketRequest['recurrence'] = null;
  if (value.recurrence !== undefined && value.recurrence !== null) {
    if (typeof value.recurrence !== 'object' || Array.isArray(value.recurrence)) throw new BadRequestException('recurrence é inválida.');
    const item = value.recurrence as Record<string, unknown>;
    const recurrenceAt = typeof item.recurrenceAt === 'string' ? item.recurrenceAt : '';
    const rule = integer(item.rule, 'recurrence.rule');
    const remaining = integer(item.remaining, 'recurrence.remaining');
    if (Number.isNaN(new Date(recurrenceAt).getTime()) || new Date(recurrenceAt).getTime() <= Date.now()) throw new BadRequestException('recurrenceAt deve estar no futuro.');
    if (![1, 2, 3, 4, 5, 6, 7].includes(rule)) throw new BadRequestException('recurrence.rule é inválida.');
    if (remaining > 12) throw new BadRequestException('recurrence.remaining deve ser no máximo 12.');
    recurrence = { recurrenceAt, rule: rule as 1 | 2 | 3 | 4 | 5 | 6 | 7, remaining, week: item.week === null || item.week === undefined ? null : integer(item.week, 'recurrence.week') };
  }
  return {
    clientId: integer(value.clientId, 'clientId'), requesterId: integer(value.requesterId, 'requesterId'),
    locationId: integer(value.locationId, 'locationId'), typeId: catalogId(value.typeId, 'typeId', TICKET_TYPES),
    categoryId: integer(value.categoryId, 'categoryId'), subcategoryId: integer(value.subcategoryId, 'subcategoryId', true),
    itemId: integer(value.itemId, 'itemId', true), levelId: catalogId(value.levelId, 'levelId', TICKET_LEVELS),
    priorityId: catalogId(value.priorityId, 'priorityId', TICKET_PRIORITIES), formId: catalogId(value.formId, 'formId', TICKET_FORMS),
    openingDescription, openingAt: value.openingAt, technicianId: integer(value.technicianId, 'technicianId', true), recurrence,
  };
}

@ApiTags('tickets')
@Controller('tickets')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsCreate)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketCreateController {
  constructor(private readonly createTicket: CreateTicket) {}

  @Get('create/catalogs')
  @ApiOperation({ summary: 'Obter clientes e técnicos para abertura' })
  catalogs(@CurrentUser() user?: AuthenticatedUser): Promise<TicketCreateCatalogsResponse> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.createTicket.catalogs(user);
  }

  @Get('create/requesters')
  @ApiOperation({ summary: 'Listar solicitantes do cliente' })
  requesters(@CurrentUser() user: AuthenticatedUser | undefined, @Query('clientId', ParseIntPipe) clientId: number): Promise<TicketCatalogOption[]> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.createTicket.requesters(user, clientId);
  }

  @Get('create/locations')
  @ApiOperation({ summary: 'Listar locais do cliente' })
  locations(@CurrentUser() user: AuthenticatedUser | undefined, @Query('clientId', ParseIntPipe) clientId: number): Promise<TicketCatalogOption[]> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.createTicket.locations(user, clientId);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastrar atendimento' })
  create(@CurrentUser() user: AuthenticatedUser | undefined, @Body() body: unknown): Promise<CreateTicketResponse> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.createTicket.execute(user, parseRequest(body));
  }
}

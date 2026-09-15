import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  type MarketingTicketAssignmentRequest,
  type MarketingTicketCatalogsResponse,
  type MarketingTicketCreateRequest,
  type MarketingTicketCreateResponse,
  type MarketingTicketDetailResponse,
  type MarketingTicketFinalizeRequest,
  type MarketingTicketHoldRequest,
  type MarketingTicketInteractionRequest,
  type MarketingTicketListResponse,
  type MarketingTicketRejectionRequest,
  type MarketingTicketUpdateRequest,
  type TicketCatalogOption,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../../access/presentation/http/legacy-session.guard';
import { normalizeLegacyLocalDateTime } from '../../../domain/legacy-local-date-time';
import { MarketingTickets } from '../application/marketing-tickets';

function integer(value: unknown, field: string, allowZero = false): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < (allowZero ? 0 : 1)
  ) {
    throw new BadRequestException(
      `${field} deve ser um inteiro ${allowZero ? 'não negativo' : 'positivo'}.`,
    );
  }
  return value;
}

function text(value: unknown, field: string, max = 10_000): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} é obrigatório.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > max) {
    throw new BadRequestException(
      `${field} deve ter entre 1 e ${max} caracteres.`,
    );
  }
  return normalized;
}

function localDateTime(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} é obrigatório.`);
  }
  const normalized = normalizeLegacyLocalDateTime(value);
  if (!normalized) {
    throw new BadRequestException(
      `${field} deve usar YYYY-MM-DDTHH:mm sem conversão de fuso.`,
    );
  }
  return normalized;
}

function createRequest(body: unknown): MarketingTicketCreateRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  const value = body as Record<string, unknown>;
  return {
    name: text(value.name, 'name', 500),
    clientId: integer(value.clientId, 'clientId'),
    requesterId: integer(value.requesterId, 'requesterId', true),
    locationId: integer(value.locationId, 'locationId', true),
    typeId: integer(value.typeId, 'typeId'),
    categoryId: integer(value.categoryId, 'categoryId'),
    subcategoryId: integer(value.subcategoryId, 'subcategoryId'),
    itemId: integer(value.itemId ?? 0, 'itemId', true),
    levelId: integer(value.levelId, 'levelId'),
    formId: integer(value.formId, 'formId'),
    openingDescription: text(value.openingDescription, 'openingDescription'),
    openingAt: localDateTime(value.openingAt, 'openingAt'),
    technicianId: integer(value.technicianId ?? 0, 'technicianId', true),
  };
}

function updateRequest(body: unknown): MarketingTicketUpdateRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  const value = body as Record<string, unknown>;
  return {
    typeId: integer(value.typeId, 'typeId'),
    categoryId: integer(value.categoryId, 'categoryId'),
    subcategoryId: integer(value.subcategoryId, 'subcategoryId'),
    itemId: integer(value.itemId ?? 0, 'itemId', true),
    levelId: integer(value.levelId, 'levelId'),
    formId: integer(value.formId, 'formId'),
    openingDescription: text(value.openingDescription, 'openingDescription'),
  };
}

function parsePositiveQuery(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseListQuery(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
  const statuses = String(query.status ?? '1,2,3')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 4);
  if (statuses.length === 0) {
    throw new BadRequestException('status deve conter valores entre 0 e 4.');
  }
  const sorts = ['status', 'id', 'client', 'openedAt', 'level', 'technician'] as const;
  const requestedSort = String(query.sort ?? 'status');
  const sort = sorts.includes(requestedSort as (typeof sorts)[number])
    ? (requestedSort as (typeof sorts)[number])
    : 'status';
  const direction = String(query.direction ?? 'asc').toLowerCase() === 'desc'
    ? 'desc' as const
    : 'asc' as const;
  const search = typeof query.search === 'string' && query.search.trim()
    ? query.search.trim().slice(0, 200)
    : undefined;
  const openedFrom = typeof query.openedFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.openedFrom)
    ? query.openedFrom
    : undefined;
  const openedTo = typeof query.openedTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.openedTo)
    ? query.openedTo
    : undefined;
  return {
    page,
    limit,
    statuses,
    clientId: parsePositiveQuery(query.clientId),
    requesterId: parsePositiveQuery(query.requesterId),
    technicianId: parsePositiveQuery(query.technicianId),
    id: parsePositiveQuery(query.id),
    search,
    openedFrom,
    openedTo,
    sort,
    direction,
  };
}

@ApiTags('ticket-marketing')
@Controller('tickets/marketing')
@UseGuards(LegacySessionGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class MarketingTicketsController {
  constructor(private readonly tickets: MarketingTickets) {}

  @Get()
  @ApiOperation({ summary: 'Listar tickets de Marketing' })
  list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: Record<string, unknown>,
  ): Promise<MarketingTicketListResponse> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.tickets.list(user, parseListQuery(query));
  }

  @Get('create/catalogs')
  @ApiOperation({ summary: 'Obter catálogos do criador Marketing' })
  catalogs(
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<MarketingTicketCatalogsResponse> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.tickets.catalogs(user);
  }

  @Get('create/requesters')
  requesters(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('clientId', ParseIntPipe) clientId: number,
  ): Promise<TicketCatalogOption[]> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.tickets.requesters(user, clientId);
  }

  @Get('create/locations')
  locations(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('clientId', ParseIntPipe) clientId: number,
  ): Promise<TicketCatalogOption[]> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.tickets.locations(user, clientId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar ticket de Marketing' })
  create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: unknown,
  ): Promise<MarketingTicketCreateResponse> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.tickets.create(user, createRequest(body));
  }

  @Get(':ticketId')
  @ApiOperation({ summary: 'Obter detalhe de ticket Marketing' })
  detail(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('ticketId', ParseIntPipe) ticketId: number,
  ): Promise<MarketingTicketDetailResponse> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    return this.tickets.detail(user, ticketId);
  }

  @Patch(':ticketId/classification')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    await this.tickets.update(user, ticketId, updateRequest(body));
  }

  @Post(':ticketId/interactions')
  @HttpCode(HttpStatus.NO_CONTENT)
  async interaction(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() body: MarketingTicketInteractionRequest,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    await this.tickets.addInteraction(user, ticketId, text(body?.description, 'description'));
  }

  @Patch(':ticketId/assignment')
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignment(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() body: MarketingTicketAssignmentRequest,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    await this.tickets.assign(user, ticketId, integer(body?.technicianId, 'technicianId'));
  }

  @Post(':ticketId/hold')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hold(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() body: MarketingTicketHoldRequest,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    await this.tickets.putOnHold(
      user,
      ticketId,
      localDateTime(body?.forecastAt, 'forecastAt'),
      text(body?.description, 'description'),
    );
  }

  @Post(':ticketId/resume')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resume(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('ticketId', ParseIntPipe) ticketId: number,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    await this.tickets.resume(user, ticketId);
  }

  @Post(':ticketId/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reject(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() body: MarketingTicketRejectionRequest,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    await this.tickets.reject(
      user,
      ticketId,
      integer(body?.technicianId, 'technicianId', true),
      text(body?.reason, 'reason'),
    );
  }

  @Post(':ticketId/finalize')
  @HttpCode(HttpStatus.NO_CONTENT)
  async finalize(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() body: MarketingTicketFinalizeRequest,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    await this.tickets.finalize(user, ticketId, text(body?.description, 'description'));
  }
}

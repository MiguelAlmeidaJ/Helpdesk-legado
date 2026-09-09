import {
  BadRequestException,
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  AppPermission,
  type DevOpsTicketCreateRequest,
  type DevOpsTicketCreateResponse,
  type TicketCatalogOption,
  type TicketCreateCatalogsResponse,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../../access/presentation/http/legacy-session.guard';
import { RequirePermissions } from '../../../../access/presentation/http/require-permissions.decorator';
import { normalizeLegacyLocalDateTime } from '../../../domain/legacy-local-date-time';
import { DevOpsTicketCreator } from '../application/devops-ticket-creator';
import { DevOpsPermissionsGuard } from '../devops-permissions.guard';

function integer(
  value: unknown,
  field: string,
  allowZero = false,
): number {
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

function text(value: unknown, field: string, max: number): string {
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

function localDateTime(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('openingAt é obrigatório.');
  }
  const normalized = normalizeLegacyLocalDateTime(value);
  if (!normalized) {
    throw new BadRequestException(
      'openingAt deve usar YYYY-MM-DDTHH:mm sem conversão de fuso.',
    );
  }
  return normalized;
}

function createRequest(body: unknown): DevOpsTicketCreateRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  const value = body as Record<string, unknown>;
  return {
    name: text(value.name, 'name', 255),
    clientId: integer(value.clientId, 'clientId'),
    requesterId: integer(value.requesterId, 'requesterId', true),
    locationId: integer(value.locationId, 'locationId', true),
    typeId: integer(value.typeId, 'typeId', true),
    categoryId: integer(value.categoryId, 'categoryId'),
    subcategoryId: integer(value.subcategoryId, 'subcategoryId', true),
    itemId: integer(value.itemId, 'itemId', true),
    levelId: integer(value.levelId, 'levelId', true),
    formId: integer(value.formId, 'formId'),
    openingDescription: text(
      value.openingDescription,
      'openingDescription',
      10_000,
    ),
    openingAt: localDateTime(value.openingAt),
    technicianId: integer(value.technicianId, 'technicianId', true),
  };
}

@ApiTags('ticket-devops-create')
@Controller('tickets/devops')
@UseGuards(LegacySessionGuard, DevOpsPermissionsGuard)
@RequirePermissions(AppPermission.TicketsRead)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class DevOpsTicketCreateController {
  constructor(private readonly creator: DevOpsTicketCreator) {}

  @Get('create/catalogs')
  @ApiOperation({ summary: 'Obter catálogos do criador de tickets DevOps' })
  catalogs(
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<TicketCreateCatalogsResponse> {
    return this.creator.catalogs(this.user(user));
  }

  @Get('create/requesters')
  requesters(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('clientId', ParseIntPipe) clientId: number,
  ): Promise<TicketCatalogOption[]> {
    return this.creator.requesters(this.user(user), clientId);
  }

  @Get('create/locations')
  locations(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('clientId', ParseIntPipe) clientId: number,
  ): Promise<TicketCatalogOption[]> {
    return this.creator.locations(this.user(user), clientId);
  }

  @Get('create/subcategories')
  subcategories(
    @Query('categoryId', ParseIntPipe) categoryId: number,
  ): Promise<TicketCatalogOption[]> {
    return this.creator.subcategories(categoryId);
  }

  @Get('create/items')
  items(
    @Query('subcategoryId', ParseIntPipe) subcategoryId: number,
  ): Promise<TicketCatalogOption[]> {
    return this.creator.items(subcategoryId);
  }

  @Post()
  @RequirePermissions(AppPermission.TicketsCreate)
  @ApiOperation({ summary: 'Criar ticket DevOps sem projeto' })
  create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: unknown,
  ): Promise<DevOpsTicketCreateResponse> {
    return this.creator.create(this.user(user), createRequest(body));
  }

  private user(user: AuthenticatedUser | undefined): AuthenticatedUser {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    return user;
  }
}

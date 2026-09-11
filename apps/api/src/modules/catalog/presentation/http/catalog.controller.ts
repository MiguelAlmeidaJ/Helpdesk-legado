import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type {
  CatalogDetailResponse,
  CatalogFiltersResponse,
  CatalogListResponse,
  CatalogResolutionResponse,
  CatalogSector,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { CatalogService } from '../../application/catalog.service';

function positiveInteger(value: string | undefined, field: string): number {
  if (!value || !/^\d+$/.test(value)) {
    throw new BadRequestException(`${field} é inválido.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new BadRequestException(`${field} é inválido.`);
  }

  return parsed;
}

function optionalPositiveInteger(
  value: string | undefined,
  field: string,
): number | undefined {
  return value === undefined || value === ''
    ? undefined
    : positiveInteger(value, field);
}

function offset(value: string | undefined): number {
  if (value === undefined || value === '') return 0;
  if (!/^\d+$/.test(value)) {
    throw new BadRequestException('offset é inválido.');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new BadRequestException('offset é inválido.');
  }
  return parsed;
}

function limit(value: string | undefined): number {
  if (value === undefined || value === '') return 30;
  const parsed = positiveInteger(value, 'limit');
  if (parsed > 100) {
    throw new BadRequestException('limit deve ser no máximo 100.');
  }
  return parsed;
}

function sector(value: string | undefined): CatalogSector | undefined {
  if (value === undefined || value === '') return undefined;
  if (value === '1') return 1;
  if (value === '2') return 2;
  throw new BadRequestException('sector é inválido.');
}

function search(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (normalized.length > 200) {
    throw new BadRequestException('search deve ter no máximo 200 caracteres.');
  }
  return normalized;
}

function authenticated(
  user: AuthenticatedUser | undefined,
): AuthenticatedUser {
  if (!user) {
    throw new UnauthorizedException('Usuário não autenticado.');
  }
  return user;
}

@ApiTags('catalog')
@Controller('catalog')
@UseGuards(LegacySessionGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('filters')
  @ApiOperation({ summary: 'Opções de filtro disponíveis para o catálogo' })
  filters(
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<CatalogFiltersResponse> {
    return this.catalog.filters(authenticated(user));
  }

  @Get('resolve')
  @ApiOperation({ summary: 'Resolve catálogos pelo contexto do atendimento' })
  resolve(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('clientId') clientIdValue?: string,
    @Query('categoryId') categoryIdValue?: string,
    @Query('sector') sectorValue?: string,
  ): Promise<CatalogResolutionResponse> {
    return this.catalog.resolve(
      authenticated(user),
      positiveInteger(clientIdValue, 'clientId'),
      positiveInteger(categoryIdValue, 'categoryId'),
      sector(sectorValue),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lista catálogos acessíveis ao usuário' })
  list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('clientId') clientIdValue?: string,
    @Query('categoryId') categoryIdValue?: string,
    @Query('search') searchValue?: string,
    @Query('sector') sectorValue?: string,
    @Query('offset') offsetValue?: string,
    @Query('limit') limitValue?: string,
  ): Promise<CatalogListResponse> {
    return this.catalog.list(authenticated(user), {
      clientId: optionalPositiveInteger(clientIdValue, 'clientId'),
      categoryId: optionalPositiveInteger(categoryIdValue, 'categoryId'),
      search: search(searchValue),
      sector: sector(sectorValue),
      offset: offset(offsetValue),
      limit: limit(limitValue),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um catálogo acessível ao usuário' })
  detail(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CatalogDetailResponse> {
    if (id < 1) {
      throw new BadRequestException('id é inválido.');
    }
    return this.catalog.detail(authenticated(user), id);
  }
}

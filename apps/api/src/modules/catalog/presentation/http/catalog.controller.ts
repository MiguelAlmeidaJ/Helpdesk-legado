import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  AppPermission,
  type CatalogDetailResponse,
  type CatalogFiltersResponse,
  type CatalogImageUploadResponse,
  type CatalogListResponse,
  type CatalogResolutionResponse,
  type CatalogSector,
  type CatalogWriteInput,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { CatalogImageStorageService } from '../../application/catalog-image-storage.service';
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

function bodyPositiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new BadRequestException(`${field} é inválido.`);
  }

  return value;
}


function hasPermission(
  user: AuthenticatedUser,
  permission: AppPermission,
): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === permission,
  );
}

function canUploadCatalogImages(user: AuthenticatedUser): boolean {
  return (
    hasPermission(user, AppPermission.CatalogManage) ||
    hasPermission(user, AppPermission.CatalogTiCreate) ||
    hasPermission(user, AppPermission.CatalogTiEdit) ||
    hasPermission(user, AppPermission.CatalogDevOpsCreate) ||
    hasPermission(user, AppPermission.CatalogDevOpsEdit)
  );
}

function canReadCatalogImage(
  user: AuthenticatedUser,
  image: {
    catalogId: number | null;
    createdBy: number;
    sector: number | null;
  },
): boolean {
  if (
    hasPermission(user, AppPermission.SystemAdmin) ||
    hasPermission(user, AppPermission.CatalogManage)
  ) {
    return true;
  }

  if (image.catalogId === null) {
    return image.createdBy === user.id && canUploadCatalogImages(user);
  }

  if (image.sector === 1) {
    return (
      hasPermission(user, AppPermission.CatalogTiRead) ||
      hasPermission(user, AppPermission.CatalogTiCreate) ||
      hasPermission(user, AppPermission.CatalogTiEdit)
    );
  }

  if (image.sector === 2) {
    return (
      hasPermission(user, AppPermission.CatalogDevOpsRead) ||
      hasPermission(user, AppPermission.CatalogDevOpsCreate) ||
      hasPermission(user, AppPermission.CatalogDevOpsEdit)
    );
  }

  return false;
}

interface UploadedCatalogImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

function writeInput(body: unknown): CatalogWriteInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Corpo da requisição é inválido.');
  }

  const input = body as Record<string, unknown>;
  const title = typeof input.title === 'string' ? input.title.trim() : '';

  if (!title) {
    throw new BadRequestException('title é obrigatório.');
  }

  if (title.length > 255) {
    throw new BadRequestException('title deve ter no máximo 255 caracteres.');
  }

  if (input.content !== undefined && typeof input.content !== 'string') {
    throw new BadRequestException('content é inválido.');
  }

  const sectorValue = input.sector;
  if (sectorValue !== 1 && sectorValue !== 2) {
    throw new BadRequestException('sector é inválido.');
  }

  return {
    sector: sectorValue,
    categoryId: bodyPositiveInteger(input.categoryId, 'categoryId'),
    clientId: bodyPositiveInteger(input.clientId, 'clientId'),
    title,
    content: typeof input.content === 'string' ? input.content.trim() : '',
  };
}

@ApiTags('catalog')
@Controller('catalog')
@UseGuards(LegacySessionGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly images: CatalogImageStorageService,
  ) {}


  @Post('images')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 8 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Armazena imagem otimizada usada em catálogo' })
  async uploadImage(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @UploadedFile() file: UploadedCatalogImage | undefined,
    @Body() body: Record<string, unknown>,
  ): Promise<CatalogImageUploadResponse> {
    const actor = authenticated(user);
    if (!canUploadCatalogImages(actor)) {
      throw new ForbiddenException('Usuário sem acesso às imagens de catálogo.');
    }
    if (!file?.buffer || file.size < 1) {
      throw new BadRequestException('Imagem não informada ou vazia.');
    }

    const width = typeof body.width === 'string' && /^\d+$/.test(body.width)
      ? Number(body.width)
      : null;
    const height = typeof body.height === 'string' && /^\d+$/.test(body.height)
      ? Number(body.height)
      : null;

    return this.images.store({
      actorUserId: actor.id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      data: file.buffer,
      width,
      height,
    });
  }

  @Get('images/:imageId/content')
  @ApiOperation({ summary: 'Abre imagem armazenada de catálogo' })
  async imageContent(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('imageId', ParseIntPipe) imageId: number,
  ): Promise<StreamableFile> {
    const actor = authenticated(user);
    const image = await this.images.content(imageId);
    if (!canReadCatalogImage(actor, image)) {
      throw new ForbiddenException('Usuário sem acesso a esta imagem de catálogo.');
    }
    return new StreamableFile(image.data, {
      type: image.mimeType,
      disposition: `inline; filename*=UTF-8''${encodeURIComponent(image.name)}`,
    });
  }

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

  @Post()
  @ApiOperation({ summary: 'Cria um catálogo no setor gerenciável pelo usuário' })
  create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: unknown,
  ): Promise<CatalogDetailResponse> {
    return this.catalog.create(authenticated(user), writeInput(body));
  }

  @Patch(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Arquiva um catálogo' })
  async archive(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    if (id < 1) throw new BadRequestException('id é inválido.');
    await this.catalog.archive(authenticated(user), id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita um catálogo permitido ao usuário' })
  update(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<CatalogDetailResponse> {
    if (id < 1) {
      throw new BadRequestException('id é inválido.');
    }

    return this.catalog.update(authenticated(user), id, writeInput(body));
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

import {
  BadRequestException,
  Body,
  Controller,
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
  UserRole,
  type NavigationAdminItemInput,
  type NavigationAdminMutationResponse,
  type NavigationAdminResponse,
  type NavigationAdminSectionInput,
  type NavigationVisibilityCondition,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { NavigationAdminService } from '../../application/navigation-admin.service';

const PERMISSIONS = new Set<string>(Object.values(AppPermission));
const ROLES = new Set<string>(Object.values(UserRole));

function objectBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Corpo da requisição é inválido.');
  }
  return body as Record<string, unknown>;
}

function requiredString(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} é obrigatório.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > max) {
    throw new BadRequestException(`${field} possui tamanho inválido.`);
  }
  return normalized;
}

function slug(value: unknown, field: string, max: number): string {
  const normalized = requiredString(value, field, max);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new BadRequestException(
      `${field} deve usar apenas letras minúsculas, números e hífen.`,
    );
  }
  return normalized;
}

function nullableString(value: unknown, field: string, max: number): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} é inválido.`);
  }
  const normalized = value.trim();
  if (normalized.length > max) {
    throw new BadRequestException(`${field} possui tamanho inválido.`);
  }
  return normalized || null;
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 1_000_000
  ) {
    throw new BadRequestException(`${field} deve ser um inteiro entre 0 e 1000000.`);
  }
  return value;
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new BadRequestException(`${field} deve ser um inteiro positivo.`);
  }
  return value;
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new BadRequestException(`${field} deve ser booleano.`);
  }
  return value;
}

function stringList(
  value: unknown,
  field: string,
  allowed: ReadonlySet<string>,
): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 50) {
    throw new BadRequestException(`${field} deve ser uma lista válida.`);
  }

  const normalized = value.map((entry) => {
    if (typeof entry !== 'string' || !allowed.has(entry)) {
      throw new BadRequestException(`${field} contém um valor desconhecido.`);
    }
    return entry;
  });

  return [...new Set(normalized)];
}

function condition(value: unknown): NavigationVisibilityCondition | null {
  if (value === null || value === undefined) return null;
  const input = objectBody(value);
  const known = new Set(['anyPermissions', 'allPermissions', 'anyRoles']);
  if (Object.keys(input).some((key) => !known.has(key))) {
    throw new BadRequestException('visibilityCondition contém uma chave desconhecida.');
  }

  const result: NavigationVisibilityCondition = {
    anyPermissions: stringList(input.anyPermissions, 'anyPermissions', PERMISSIONS),
    allPermissions: stringList(input.allPermissions, 'allPermissions', PERMISSIONS),
    anyRoles: stringList(input.anyRoles, 'anyRoles', ROLES),
  };

  return result.anyPermissions.length ||
    result.allPermissions.length ||
    result.anyRoles.length
    ? result
    : null;
}

function sectionInput(body: unknown): NavigationAdminSectionInput {
  const input = objectBody(body);
  return {
    slug: slug(input.slug, 'slug', 100),
    label: requiredString(input.label, 'label', 150),
    shortLabel: nullableString(input.shortLabel, 'shortLabel', 20),
    sortOrder: nonNegativeInteger(input.sortOrder, 'sortOrder'),
    active: booleanValue(input.active, 'active'),
  };
}

function itemInput(body: unknown): NavigationAdminItemInput {
  const input = objectBody(body);
  const status = input.status;
  if (status !== 'available' && status !== 'planned') {
    throw new BadRequestException('status deve ser available ou planned.');
  }

  const href = nullableString(input.href, 'href', 500);
  if (href && (!href.startsWith('/') || href.startsWith('//'))) {
    throw new BadRequestException('href deve ser uma rota interna iniciada por /.');
  }
  if (status === 'available' && !href) {
    throw new BadRequestException('Itens disponíveis precisam de href.');
  }

  return {
    sectionId: positiveInteger(input.sectionId, 'sectionId'),
    slug: slug(input.slug, 'slug', 120),
    label: requiredString(input.label, 'label', 160),
    href,
    status,
    visibilityCondition: condition(input.visibilityCondition),
    sortOrder: nonNegativeInteger(input.sortOrder, 'sortOrder'),
    active: booleanValue(input.active, 'active'),
  };
}

function positiveId(id: number): number {
  if (id < 1) throw new BadRequestException('id é inválido.');
  return id;
}

@ApiTags('navigation-admin')
@Controller('navigation/admin')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.SystemAdmin)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class NavigationAdminController {
  constructor(private readonly navigation: NavigationAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Lista toda a configuração administrativa do menu' })
  snapshot(): Promise<NavigationAdminResponse> {
    return this.navigation.snapshot();
  }

  @Post('sections')
  @ApiOperation({ summary: 'Cria uma seção de navegação' })
  createSection(@Body() body: unknown): Promise<NavigationAdminMutationResponse> {
    return this.navigation.createSection(sectionInput(body));
  }

  @Patch('sections/:id')
  @ApiOperation({ summary: 'Atualiza uma seção de navegação' })
  updateSection(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<NavigationAdminMutationResponse> {
    return this.navigation.updateSection(positiveId(id), sectionInput(body));
  }

  @Post('items')
  @ApiOperation({ summary: 'Cria um item de navegação' })
  createItem(@Body() body: unknown): Promise<NavigationAdminMutationResponse> {
    return this.navigation.createItem(itemInput(body));
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Atualiza um item de navegação' })
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<NavigationAdminMutationResponse> {
    return this.navigation.updateItem(positiveId(id), itemInput(body));
  }
}

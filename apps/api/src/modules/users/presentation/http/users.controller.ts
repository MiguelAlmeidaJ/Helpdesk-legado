import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  AppPermission,
  type CreateManagedUserRequest,
  type ManagedUserDetail,
  type ManagedUserListResponse,
  type UpdateManagedUserRequest,
  type UserManagementCatalogs,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../../../../core/security/password-policy';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { UserManagement } from '../../application/user-management';

function objectBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  return body as Record<string, unknown>;
}

function requiredString(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string') throw new BadRequestException(`${field} é obrigatório.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new BadRequestException(`${field} possui tamanho inválido.`);
  return normalized;
}

function optionalString(value: unknown, field: string, max: number): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.trim().length > max) throw new BadRequestException(`${field} possui tamanho inválido.`);
  return value.trim();
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new BadRequestException(`${field} deve ser um inteiro positivo.`);
  }
  return value;
}

function idList(value: unknown): number[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new BadRequestException('companyIds deve ser uma lista.');
  const ids = value.map((id) => positiveInteger(id, 'companyIds'));
  return [...new Set(ids)];
}

function modules(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length !== 9 || value.some((entry) => typeof entry !== 'string' || !/^\d{10}$/.test(entry))) {
    throw new BadRequestException('legacyModules deve conter nove códigos numéricos de 10 posições.');
  }
  return value as string[];
}

function baseInput(body: unknown) {
  const value = objectBody(body);
  const email = requiredString(value.email, 'email', 60).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('E-mail inválido.');
  const type = value.type;
  if (type !== 1 && type !== 2) throw new BadRequestException('type deve ser 1 ou 2.');
  const companyIds = idList(value.companyIds);
  if (type === 2 && companyIds.length === 0) throw new BadRequestException('Usuários clientes precisam de ao menos uma empresa.');
  const pixKeyType = value.pixKeyType === null || value.pixKeyType === undefined
    ? null
    : positiveInteger(value.pixKeyType, 'pixKeyType');
  const pixKey = optionalString(value.pixKey, 'pixKey', 255);
  if (pixKey && !pixKeyType) throw new BadRequestException('Selecione o tipo da chave Pix.');
  return {
    value,
    input: {
      name: requiredString(value.name, 'name', 60),
      email,
      phone: requiredString(value.phone, 'phone', 20),
      functionId: positiveInteger(value.functionId, 'functionId'),
      login: requiredString(value.login, 'login', 15),
      type,
      link: optionalString(value.link, 'link', 50),
      pixKeyType,
      pixKey,
      companyIds,
      legacyModules: modules(value.legacyModules),
    },
  };
}

function hasPermission(user: AuthenticatedUser, permission: AppPermission): boolean {
  return user.grants.some((grant) => grant.permission === AppPermission.SystemAdmin || grant.permission === permission);
}

@ApiTags('users')
@Controller('users')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class UsersController {
  constructor(private readonly management: UserManagement) {}

  @Get()
  @RequirePermissions(AppPermission.UsersRead)
  @ApiOperation({ summary: 'Listar usuários' })
  list(@Query('page') pageValue?: string, @Query('limit') limitValue?: string, @Query('search') searchValue?: string): Promise<ManagedUserListResponse> {
    const page = pageValue ? Number(pageValue) : 1;
    const limit = limitValue ? Number(limitValue) : 50;
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('Paginação inválida.');
    }
    return this.management.list(page, limit, searchValue?.trim().slice(0, 100) ?? '');
  }

  @Get('catalogs')
  @RequirePermissions(AppPermission.UsersRead)
  @ApiOperation({ summary: 'Obter catálogos da gestão de usuários' })
  catalogs(): Promise<UserManagementCatalogs> { return this.management.catalogs(); }

  @Get(':id')
  @RequirePermissions(AppPermission.UsersRead)
  @ApiOperation({ summary: 'Obter usuário' })
  detail(@Param('id', ParseIntPipe) id: number): Promise<ManagedUserDetail> { return this.management.detail(id); }

  @Post()
  @RequirePermissions(AppPermission.UsersCreate)
  @ApiOperation({ summary: 'Cadastrar usuário' })
  @ApiResponse({ status: 201, description: 'Usuário cadastrado.' })
  create(@Body() body: unknown): Promise<ManagedUserDetail> {
    const { value, input } = baseInput(body);
    const password = requiredString(value.password, 'password', 100);
    if (!isStrongPassword(password)) throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
    return this.management.create({ ...input, password } as CreateManagedUserRequest);
  }

  @Patch(':id')
  @RequirePermissions(AppPermission.UsersEdit)
  @ApiOperation({ summary: 'Atualizar usuário' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ): Promise<ManagedUserDetail> {
    if (!actor) throw new UnauthorizedException('Usuário não autenticado.');
    const { value, input } = baseInput(body);
    if (value.status !== 1 && value.status !== 2) throw new BadRequestException('status deve ser 1 ou 2.');
    const canManageAccess = hasPermission(actor, AppPermission.UsersManageAccess);
    if (input.legacyModules && !canManageAccess) throw new BadRequestException('Sem permissão para alterar acessos.');
    return this.management.update(id, actor.id, { ...input, status: value.status } as UpdateManagedUserRequest, canManageAccess);
  }

  @Delete(':id')
  @RequirePermissions(AppPermission.UsersEdit)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar usuário' })
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (!actor) throw new UnauthorizedException('Usuário não autenticado.');
    await this.management.deactivate(id, actor.id);
  }
}

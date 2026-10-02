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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  AppPermission,
  type AccessManagementSnapshot,
  type AccessRoleInput,
  type AccessRoleMutationResponse,
  type AccessUserPermissionEffect,
  type AccessUserPermissionSnapshot,
  type AccessUserPermissionTarget,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../domain/authenticated-user';
import { CurrentUser } from './current-user.decorator';
import { AccessManagement } from '../../application/access-management';
import { LegacySessionGuard } from './legacy-session.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './require-permissions.decorator';

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

function optionalString(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > max) {
    throw new BadRequestException(`${field} possui tamanho inválido.`);
  }
  return value.trim() || null;
}

function idList(value: unknown, field: string): number[] {
  if (!Array.isArray(value) || value.length > 500) {
    throw new BadRequestException(`${field} deve ser uma lista válida.`);
  }
  const ids = value.map((id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException(`${field} contém um identificador inválido.`);
    }
    return id;
  });
  return [...new Set(ids)];
}

function input(body: unknown): AccessRoleInput {
  const value = objectBody(body);
  return {
    name: requiredString(value.name, 'name', 100),
    description: optionalString(value.description, 'description', 255),
    permissionIds: idList(value.permissionIds, 'permissionIds'),
  };
}

@ApiTags('access-management')
@Controller('access-management')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class AccessManagementController {
  constructor(private readonly access: AccessManagement) {}

  @Get()
  @RequirePermissions(AppPermission.UsersManageAccess)
  @ApiOperation({ summary: 'Listar tipos de usuário e permissões do sistema' })
  snapshot(
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ): Promise<AccessManagementSnapshot> {
    if (!actor) throw new BadRequestException('Usuário não autenticado.');
    const isSystemAdmin = actor.grants.some(
      (grant) => grant.permission === AppPermission.SystemAdmin,
    );
    return this.access.snapshot(isSystemAdmin);
  }

  @Post('roles')
  @RequirePermissions(AppPermission.UsersManageAccess)
  @ApiOperation({ summary: 'Criar um tipo de usuário' })
  create(@Body() body: unknown): Promise<AccessRoleMutationResponse> {
    return this.access.create(input(body));
  }

  @Patch('roles/order')
  @RequirePermissions(AppPermission.UsersManageAccess)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reordenar tipos de usuário' })
  async reorder(
    @Body() body: unknown,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (!actor) throw new BadRequestException('Usuário não autenticado.');
    const value = objectBody(body);
    const isSystemAdmin = actor.grants.some(
      (grant) => grant.permission === AppPermission.SystemAdmin,
    );
    await this.access.reorder(
      idList(value.roleIds, 'roleIds'),
      isSystemAdmin,
    );
  }

  @Patch('roles/:id')
  @RequirePermissions(AppPermission.UsersManageAccess)
  @ApiOperation({ summary: 'Atualizar permissões de um tipo de usuário' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown): Promise<AccessRoleMutationResponse> {
    if (id < 1) throw new BadRequestException('id inválido.');
    return this.access.update(id, input(body));
  }

  @Delete('roles/:id')
  @RequirePermissions(AppPermission.UsersManageAccess)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir um tipo de usuário' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    if (id < 1) throw new BadRequestException('id inválido.');
    await this.access.remove(id);
  }

  @Get('users')
  @RequirePermissions(AppPermission.UsersManageOverrides)
  @ApiOperation({ summary: 'Listar usuários disponíveis para permissão direta' })
  userTargets(
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ): Promise<AccessUserPermissionTarget[]> {
    if (!actor) throw new BadRequestException('Usuário não autenticado.');
    const isSystemAdmin = actor.grants.some(
      (grant) => grant.permission === AppPermission.SystemAdmin,
    );
    return this.access.userTargets(isSystemAdmin);
  }

  @Get('users/:id')
  @RequirePermissions(AppPermission.UsersManageOverrides)
  @ApiOperation({ summary: 'Obter permissões diretas e herdadas de um usuário' })
  userPermissionSnapshot(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ): Promise<AccessUserPermissionSnapshot> {
    if (id < 1) throw new BadRequestException('id inválido.');
    if (!actor) throw new BadRequestException('Usuário não autenticado.');
    const isSystemAdmin = actor.grants.some(
      (grant) => grant.permission === AppPermission.SystemAdmin,
    );
    return this.access.userPermissionSnapshot(id, isSystemAdmin);
  }

  @Patch('users/:id')
  @RequirePermissions(AppPermission.UsersManageOverrides)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Atualizar permissões diretas de um usuário' })
  async updateUserPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (id < 1) throw new BadRequestException('id inválido.');
    if (!actor) throw new BadRequestException('Usuário não autenticado.');

    const value = objectBody(body);
    if (!Array.isArray(value.overrides) || value.overrides.length > 500) {
      throw new BadRequestException('overrides deve ser uma lista válida.');
    }

    const overrides = value.overrides.map((entry) => {
      const item = objectBody(entry);
      const permissionId = Number(item.permissionId);
      const effect = item.effect;
      if (!Number.isSafeInteger(permissionId) || permissionId < 1) {
        throw new BadRequestException('permissionId inválido.');
      }
      if (effect !== 'allow' && effect !== 'deny') {
        throw new BadRequestException('effect deve ser allow ou deny.');
      }
      return {
        permissionId,
        effect: effect as AccessUserPermissionEffect,
      };
    });

    const unique = new Map(
      overrides.map((override) => [override.permissionId, override] as const),
    );
    const isSystemAdmin = actor.grants.some(
      (grant) => grant.permission === AppPermission.SystemAdmin,
    );

    await this.access.updateUserPermissions(
      id,
      [...unique.values()],
      actor.id,
      isSystemAdmin,
    );
  }
}

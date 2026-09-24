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
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
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
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} é obrigatório.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > max) {
    throw new BadRequestException(`${field} possui tamanho inválido.`);
  }
  return normalized;
}

function optionalString(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > max) {
    throw new BadRequestException(`${field} possui tamanho inválido.`);
  }
  return value.trim() || null;
}

function permissionIds(value: unknown): number[] {
  if (!Array.isArray(value) || value.length > 500) {
    throw new BadRequestException('permissionIds deve ser uma lista válida.');
  }
  const ids = value.map((id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException('permissionIds contém um identificador inválido.');
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
    permissionIds: permissionIds(value.permissionIds),
  };
}

@ApiTags('access-management')
@Controller('access-management')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.UsersManageAccess)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class AccessManagementController {
  constructor(private readonly access: AccessManagement) {}

  @Get()
  @ApiOperation({ summary: 'Listar tipos de usuário e permissões do sistema' })
  snapshot(): Promise<AccessManagementSnapshot> {
    return this.access.snapshot();
  }

  @Post('roles')
  @ApiOperation({ summary: 'Criar um tipo de usuário' })
  create(@Body() body: unknown): Promise<AccessRoleMutationResponse> {
    return this.access.create(input(body));
  }

  @Patch('roles/:id')
  @ApiOperation({ summary: 'Atualizar permissões de um tipo de usuário' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<AccessRoleMutationResponse> {
    if (id < 1) throw new BadRequestException('id inválido.');
    return this.access.update(id, input(body));
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir um tipo de usuário personalizado' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    if (id < 1) throw new BadRequestException('id inválido.');
    await this.access.remove(id);
  }
}

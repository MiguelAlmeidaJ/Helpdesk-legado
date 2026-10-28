import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
  type AccessPermissionItem,
  type UserFunctionInput,
  type UserFunctionMutationResponse,
  type UserFunctionSummary,
  type UserFunctionActiveMembersResponse,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import { UserFunctionManagement } from '../../application/user-function-management';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';

function input(body: unknown): UserFunctionInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  const value = body as Record<string, unknown>;
  if (typeof value.name !== 'string') {
    throw new BadRequestException('name é obrigatório.');
  }
  const name = value.name.trim();
  if (!name || name.length > 50) {
    throw new BadRequestException('name deve conter entre 1 e 50 caracteres.');
  }
  if (value.status !== 1 && value.status !== 2) {
    throw new BadRequestException('status deve ser 1 ou 2.');
  }
  if (!Array.isArray(value.permissionIds) || value.permissionIds.some((id) => !Number.isSafeInteger(id) || Number(id) < 1)) {
    throw new BadRequestException('permissionIds deve ser uma lista de IDs válidos.');
  }
  return { name, status: value.status, permissionIds: [...new Set(value.permissionIds.map(Number))] };
}

@ApiTags('user-functions')
@Controller('user-functions')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.SystemAdmin)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class UserFunctionsController {
  constructor(private readonly management: UserFunctionManagement) {}

  @Get()
  @ApiOperation({ summary: 'Listar funções de usuários' })
  list(): Promise<UserFunctionSummary[]> {
    return this.management.list();
  }

  @Get('active-users')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Consultar usuários ativos por função e sem função válida' })
  activeUsers(): Promise<UserFunctionActiveMembersResponse> {
    return this.management.activeUsers();
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Listar permissões disponíveis para funções' })
  permissions(): Promise<AccessPermissionItem[]> {
    return this.management.permissions();
  }

  @Post()
  @ApiOperation({ summary: 'Criar função de usuário' })
  create(@Body() body: unknown): Promise<UserFunctionMutationResponse> {
    return this.management.create(input(body));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar função de usuário' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<UserFunctionMutationResponse> {
    if (id < 1) throw new BadRequestException('id inválido.');
    return this.management.update(id, input(body));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir função sem usuários ativos, preservando os cadastros inativos' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    if (id < 1) throw new BadRequestException('id inválido.');
    await this.management.remove(id);
  }
}

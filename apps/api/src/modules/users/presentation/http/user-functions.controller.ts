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
  type UserFunctionInput,
  type UserFunctionMutationResponse,
  type UserFunctionSummary,
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
  return { name, status: value.status };
}

@ApiTags('user-functions')
@Controller('user-functions')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.UsersManageAccess)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class UserFunctionsController {
  constructor(private readonly management: UserFunctionManagement) {}

  @Get()
  @ApiOperation({ summary: 'Listar funções de usuários' })
  list(): Promise<UserFunctionSummary[]> {
    return this.management.list();
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
  @ApiOperation({ summary: 'Excluir função de usuário sem vínculos' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    if (id < 1) throw new BadRequestException('id inválido.');
    await this.management.remove(id);
  }
}

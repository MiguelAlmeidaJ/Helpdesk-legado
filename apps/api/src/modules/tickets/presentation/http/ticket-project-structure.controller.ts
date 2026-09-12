import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppPermission,
  type TicketProjectCreateRequest,
  type TicketProjectCreateResponse,
  type TicketProjectTaskCreateRequest,
  type TicketProjectTaskCreateResponse,
  type TicketProjectTaskDependencyRequest,
  type TicketProjectTaskUpdateRequest,
  type TicketProjectUpdateRequest,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { DevOpsPermissionsGuard } from '../../types/devops/devops-permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { TicketProjectStructure } from '../../application/ticket-project-structure';
import { normalizeLegacyLocalDateTime } from '../../domain/legacy-local-date-time';

function recordBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  return body as Record<string, unknown>;
}

function text(
  value: unknown,
  field: string,
  maxLength: number,
  minLength = 1,
): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} é obrigatório.`);
  }
  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new BadRequestException(
      `${field} deve ter entre ${minLength} e ${maxLength} caracteres.`,
    );
  }
  return normalized;
}

function integer(
  value: unknown,
  field: string,
  options: { allowZero?: boolean; max?: number } = {},
): number {
  const minimum = options.allowZero ? 0 : 1;
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    (options.max !== undefined && value > options.max)
  ) {
    const range =
      options.max !== undefined
        ? ` entre ${minimum} e ${options.max}`
        : options.allowZero
          ? ' não negativo'
          : ' positivo';
    throw new BadRequestException(`${field} deve ser um inteiro${range}.`);
  }
  return value;
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

function structureFields(
  value: Record<string, unknown>,
  allowEmptyDescription = false,
) {
  return {
    typeId: integer(value.typeId, 'typeId', { allowZero: true }),
    categoryId: integer(value.categoryId, 'categoryId'),
    subcategoryId: integer(value.subcategoryId, 'subcategoryId', {
      allowZero: true,
    }),
    itemId: integer(value.itemId, 'itemId', { allowZero: true }),
    levelId: integer(value.levelId, 'levelId', { allowZero: true }),
    formId: integer(value.formId, 'formId'),
    openingDescription: text(
      value.openingDescription,
      'openingDescription',
      10_000,
      allowEmptyDescription ? 0 : 1,
    ),
  };
}

function projectCreateRequest(body: unknown): TicketProjectCreateRequest {
  const value = recordBody(body);
  return {
    name: text(value.name, 'name', 255),
    clientId: integer(value.clientId, 'clientId'),
    requesterId: integer(value.requesterId, 'requesterId', { allowZero: true }),
    locationId: integer(value.locationId, 'locationId', { allowZero: true }),
    ...structureFields(value),
    openingAt: localDateTime(value.openingAt, 'openingAt'),
    technicianId: integer(value.technicianId, 'technicianId', {
      allowZero: true,
    }),
  };
}

function projectUpdateRequest(body: unknown): TicketProjectUpdateRequest {
  return structureFields(recordBody(body), true);
}

function projectTaskCreateRequest(
  body: unknown,
): TicketProjectTaskCreateRequest {
  const value = recordBody(body);
  return {
    name: text(value.name, 'name', 255),
    requesterId: integer(value.requesterId, 'requesterId', { allowZero: true }),
    locationId: integer(value.locationId, 'locationId', { allowZero: true }),
    ...structureFields(value),
    openingAt: localDateTime(value.openingAt, 'openingAt'),
    technicianId: integer(value.technicianId, 'technicianId', {
      allowZero: true,
    }),
    days: integer(value.days, 'days', { allowZero: true, max: 3650 }),
    dependencyTaskId: integer(value.dependencyTaskId, 'dependencyTaskId', {
      allowZero: true,
    }),
  };
}

function projectTaskUpdateRequest(
  body: unknown,
): TicketProjectTaskUpdateRequest {
  return structureFields(recordBody(body), true);
}

function dependencyRequest(body: unknown): TicketProjectTaskDependencyRequest {
  const value = recordBody(body);
  return {
    dependencyTaskId: integer(value.dependencyTaskId, 'dependencyTaskId', {
      allowZero: true,
    }),
  };
}

@ApiTags('ticket-project-structure')
@Controller('tickets/projects')
@UseGuards(LegacySessionGuard, DevOpsPermissionsGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketProjectStructureController {
  constructor(private readonly structure: TicketProjectStructure) {}

  @Post()
  @RequirePermissions(AppPermission.TicketsCreate)
  @ApiOperation({ summary: 'Criar projeto de atendimento' })
  @ApiResponse({ status: 201, description: 'Projeto criado.' })
  async createProject(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: unknown,
  ): Promise<TicketProjectCreateResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    return this.structure.createProject(user, projectCreateRequest(body));
  }

  @Patch(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsEdit)
  @ApiOperation({ summary: 'Editar classificação e descrição do projeto' })
  @ApiResponse({ status: 204, description: 'Projeto atualizado.' })
  async updateProject(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    await this.structure.updateProject(
      user,
      projectId,
      projectUpdateRequest(body),
    );
  }

  @Post(':projectId/tasks')
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsCreate)
  @ApiOperation({ summary: 'Criar tarefa dentro do projeto' })
  @ApiResponse({ status: 201, description: 'Tarefa criada.' })
  async createTask(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() body: unknown,
  ): Promise<TicketProjectTaskCreateResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    return this.structure.createTask(
      user,
      projectId,
      projectTaskCreateRequest(body),
    );
  }

  @Patch('tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsEdit)
  @ApiOperation({ summary: 'Editar classificação e descrição da tarefa' })
  @ApiResponse({ status: 204, description: 'Tarefa atualizada.' })
  async updateTask(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    await this.structure.updateTask(
      user,
      taskId,
      projectTaskUpdateRequest(body),
    );
  }

  @Patch('tasks/:taskId/dependency')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsEdit)
  @ApiOperation({ summary: 'Alterar dependência da tarefa de projeto' })
  @ApiResponse({ status: 204, description: 'Dependência atualizada.' })
  async updateDependency(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    const request = dependencyRequest(body);
    await this.structure.updateTaskDependency(
      user,
      taskId,
      request.dependencyTaskId,
    );
  }
}

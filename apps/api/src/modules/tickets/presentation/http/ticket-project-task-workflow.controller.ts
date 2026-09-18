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
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppPermission,
  type TicketProjectTaskAssignmentRequest,
  type TicketProjectTaskFinalizeRequest,
  type TicketProjectTaskHoldRequest,
  type TicketProjectTaskInteractionRequest,
  type TicketProjectTaskProgressRequest,
  type TicketProjectTaskRejectionRequest,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { DevOpsPermissionsGuard } from '../../types/devops/devops-permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { TicketProjectTaskWorkflow } from '../../application/ticket-project-task-workflow';
import { normalizeLegacyLocalDateTime } from '../../domain/legacy-local-date-time';

function recordBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Corpo da requisição inválido.');
  }

  return body as Record<string, unknown>;
}

function normalizedText(
  value: unknown,
  field: string,
  maxLength = 10_000,
): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} é obrigatório.`);
  }

  const normalized = value.trim();

  if (normalized.length < 1 || normalized.length > maxLength) {
    throw new BadRequestException(
      `${field} deve ter entre 1 e ${maxLength} caracteres.`,
    );
  }

  return normalized;
}

function interactionRequest(
  body: unknown,
): TicketProjectTaskInteractionRequest {
  const value = recordBody(body);
  return {
    description: normalizedText(value.description, 'description'),
  };
}

function assignmentRequest(
  body: unknown,
): TicketProjectTaskAssignmentRequest {
  const value = recordBody(body);
  const technicianId = value.technicianId;

  if (
    typeof technicianId !== 'number' ||
    !Number.isSafeInteger(technicianId) ||
    technicianId < 1
  ) {
    throw new BadRequestException(
      'technicianId deve ser um inteiro positivo.',
    );
  }

  return { technicianId };
}

function holdRequest(body: unknown): TicketProjectTaskHoldRequest {
  const value = recordBody(body);
  const forecastAt =
    typeof value.forecastAt === 'string'
      ? normalizeLegacyLocalDateTime(value.forecastAt)
      : null;

  if (!forecastAt) {
    throw new BadRequestException(
      'forecastAt deve usar YYYY-MM-DDTHH:mm sem conversão de fuso.',
    );
  }

  return {
    forecastAt,
    description: normalizedText(value.description, 'description'),
  };
}

function rejectionRequest(
  body: unknown,
): TicketProjectTaskRejectionRequest {
  const value = recordBody(body);
  const technicianId = value.technicianId;

  if (
    typeof technicianId !== 'number' ||
    !Number.isSafeInteger(technicianId) ||
    technicianId < 0
  ) {
    throw new BadRequestException(
      'technicianId deve ser zero ou um inteiro positivo.',
    );
  }

  return {
    technicianId,
    reason: normalizedText(value.reason, 'reason'),
  };
}

function finalizeRequest(
  body: unknown,
): TicketProjectTaskFinalizeRequest {
  const value = recordBody(body);
  return {
    description: normalizedText(value.description, 'description'),
  };
}

function progressRequest(body: unknown): TicketProjectTaskProgressRequest {
  const value = recordBody(body);
  const progress = value.progress;

  if (
    typeof progress !== 'number' ||
    !Number.isSafeInteger(progress) ||
    progress < 0 ||
    progress > 100
  ) {
    throw new BadRequestException(
      'progress deve ser um inteiro entre 0 e 100.',
    );
  }

  return { progress };
}

@ApiTags('tickets')
@Controller('tickets/projects/tasks')
@UseGuards(LegacySessionGuard, DevOpsPermissionsGuard)
@RequirePermissions(AppPermission.TicketsRead)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketProjectTaskWorkflowController {
  constructor(private readonly workflow: TicketProjectTaskWorkflow) {}

  @Post(':taskId/interactions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Adicionar interação à tarefa de projeto' })
  @ApiParam({ name: 'taskId', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['description'],
      properties: {
        description: { type: 'string', minLength: 1, maxLength: 10_000 },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Interação registrada.' })
  async interaction(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = interactionRequest(body);
    await this.workflow.addInteraction({
      user,
      taskId,
      description: request.description,
    });
  }

  @Patch(':taskId/assignment')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(
    AppPermission.TicketsRead,
    AppPermission.TicketsExecute,
  )
  @ApiOperation({ summary: 'Iniciar ou direcionar tarefa de projeto' })
  @ApiParam({ name: 'taskId', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['technicianId'],
      properties: {
        technicianId: { type: 'integer', minimum: 1 },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Tarefa iniciada ou direcionada.' })
  async assignment(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = assignmentRequest(body);
    await this.workflow.assign({
      user,
      taskId,
      technicianId: request.technicianId,
    });
  }

  @Post(':taskId/hold')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsHold)
  @ApiOperation({ summary: 'Colocar tarefa de projeto em espera' })
  @ApiParam({ name: 'taskId', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['forecastAt', 'description'],
      properties: {
        forecastAt: {
          type: 'string',
          example: '2026-09-09T14:30',
        },
        description: { type: 'string', minLength: 1, maxLength: 10_000 },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Tarefa colocada em espera.' })
  async hold(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = holdRequest(body);
    await this.workflow.putOnHold({
      user,
      taskId,
      forecastAt: request.forecastAt,
      description: request.description,
    });
  }

  @Post(':taskId/resume')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsHold)
  @ApiOperation({ summary: 'Retomar tarefa de projeto em espera' })
  @ApiParam({ name: 'taskId', type: Number })
  @ApiResponse({ status: 204, description: 'Tarefa retomada.' })
  async resume(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('taskId', ParseIntPipe) taskId: number,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    await this.workflow.resume({ user, taskId });
  }

  @Post(':taskId/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsReject)
  @ApiOperation({ summary: 'Recusar ou redirecionar tarefa de projeto' })
  @ApiParam({ name: 'taskId', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['technicianId', 'reason'],
      properties: {
        technicianId: {
          type: 'integer',
          minimum: 0,
          description: 'Zero remove a atribuição.',
        },
        reason: { type: 'string', minLength: 1, maxLength: 10_000 },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Tarefa recusada ou redirecionada.' })
  async reject(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = rejectionRequest(body);
    await this.workflow.reject({
      user,
      taskId,
      technicianId: request.technicianId,
      reason: request.reason,
    });
  }

  @Post(':taskId/finalize')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsClose)
  @ApiOperation({ summary: 'Finalizar tarefa de projeto' })
  @ApiParam({ name: 'taskId', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['description'],
      properties: {
        description: { type: 'string', minLength: 1, maxLength: 10_000 },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Tarefa finalizada.' })
  async finalize(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = finalizeRequest(body);
    await this.workflow.finalize({
      user,
      taskId,
      description: request.description,
    });
  }

  @Patch(':taskId/progress')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(
    AppPermission.TicketsRead,
    AppPermission.TicketsExecute,
  )
  @ApiOperation({ summary: 'Atualizar percentual da tarefa de projeto' })
  @ApiParam({ name: 'taskId', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['progress'],
      properties: {
        progress: { type: 'integer', minimum: 0, maximum: 100 },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Percentual atualizado.' })
  async progress(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = progressRequest(body);
    await this.workflow.updateProgress({
      user,
      taskId,
      progress: request.progress,
    });
  }
}

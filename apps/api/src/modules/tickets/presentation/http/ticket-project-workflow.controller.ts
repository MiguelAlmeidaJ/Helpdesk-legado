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
  type TicketProjectAssignmentRequest,
  type TicketProjectFinalizeRequest,
  type TicketProjectHoldRequest,
  type TicketProjectInteractionRequest,
  type TicketProjectRejectionRequest,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { TicketProjectWorkflow } from '../../application/ticket-project-workflow';
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

function interactionRequest(body: unknown): TicketProjectInteractionRequest {
  const value = recordBody(body);
  return {
    description: normalizedText(value.description, 'description'),
  };
}

function assignmentRequest(body: unknown): TicketProjectAssignmentRequest {
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

function holdRequest(body: unknown): TicketProjectHoldRequest {
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

function rejectionRequest(body: unknown): TicketProjectRejectionRequest {
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

function finalizeRequest(body: unknown): TicketProjectFinalizeRequest {
  const value = recordBody(body);
  return {
    description: normalizedText(value.description, 'description'),
  };
}

@ApiTags('ticket-project-workflow')
@Controller('tickets/projects')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsRead)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketProjectWorkflowController {
  constructor(private readonly workflow: TicketProjectWorkflow) {}

  @Post(':projectId/interactions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Adicionar interação ao projeto' })
  @ApiParam({ name: 'projectId', type: Number })
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
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = interactionRequest(body);
    await this.workflow.addInteraction({
      user,
      projectId,
      description: request.description,
    });
  }

  @Patch(':projectId/assignment')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(
    AppPermission.TicketsRead,
    AppPermission.TicketsExecute,
  )
  @ApiOperation({ summary: 'Iniciar ou direcionar projeto' })
  @ApiParam({ name: 'projectId', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['technicianId'],
      properties: {
        technicianId: { type: 'integer', minimum: 1 },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Projeto iniciado ou direcionado.' })
  async assignment(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = assignmentRequest(body);
    await this.workflow.assign({
      user,
      projectId,
      technicianId: request.technicianId,
    });
  }

  @Post(':projectId/hold')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsHold)
  @ApiOperation({ summary: 'Colocar projeto em espera' })
  @ApiParam({ name: 'projectId', type: Number })
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
  @ApiResponse({ status: 204, description: 'Projeto colocado em espera.' })
  async hold(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = holdRequest(body);
    await this.workflow.putOnHold({
      user,
      projectId,
      forecastAt: request.forecastAt,
      description: request.description,
    });
  }

  @Post(':projectId/resume')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsHold)
  @ApiOperation({ summary: 'Retomar projeto em espera' })
  @ApiParam({ name: 'projectId', type: Number })
  @ApiResponse({ status: 204, description: 'Projeto retomado.' })
  async resume(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('projectId', ParseIntPipe) projectId: number,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    await this.workflow.resume({ user, projectId });
  }

  @Post(':projectId/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsReject)
  @ApiOperation({ summary: 'Recusar ou redirecionar projeto' })
  @ApiParam({ name: 'projectId', type: Number })
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
  @ApiResponse({ status: 204, description: 'Projeto recusado ou redirecionado.' })
  async reject(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = rejectionRequest(body);
    await this.workflow.reject({
      user,
      projectId,
      technicianId: request.technicianId,
      reason: request.reason,
    });
  }

  @Post(':projectId/finalize')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsClose)
  @ApiOperation({ summary: 'Finalizar projeto manualmente' })
  @ApiParam({ name: 'projectId', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['description'],
      properties: {
        description: { type: 'string', minLength: 1, maxLength: 10_000 },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Projeto finalizado.' })
  async finalize(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = finalizeRequest(body);
    await this.workflow.finalize({
      user,
      projectId,
      description: request.description,
    });
  }
}

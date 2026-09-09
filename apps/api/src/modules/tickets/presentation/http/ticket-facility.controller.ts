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
  type TicketFacilityAssignmentRequest,
  type TicketFacilityClassificationRequest,
  type TicketFacilityCreateRequest,
  type TicketFacilityCreateResponse,
  type TicketFacilityFinalizeRequest,
  type TicketFacilityHoldRequest,
  type TicketFacilityInteractionRequest,
  type TicketFacilityRejectionRequest,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { TicketFacilityCommands } from '../../application/ticket-facility-commands';
import { normalizeLegacyLocalDateTime } from '../../domain/legacy-local-date-time';

function recordBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Corpo da requisição inválido.');
  }

  return body as Record<string, unknown>;
}

function integer(
  value: unknown,
  field: string,
  options: { allowZero?: boolean } = {},
): number {
  const minimum = options.allowZero ? 0 : 1;

  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum
  ) {
    throw new BadRequestException(
      `${field} deve ser um inteiro ${options.allowZero ? 'não negativo' : 'positivo'}.`,
    );
  }

  return value;
}

function text(
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

function createRequest(body: unknown): TicketFacilityCreateRequest {
  const value = recordBody(body);

  return {
    clientId: integer(value.clientId, 'clientId'),
    requesterId: integer(value.requesterId, 'requesterId', { allowZero: true }),
    locationId: integer(value.locationId, 'locationId', { allowZero: true }),
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
    ),
    openingAt: localDateTime(value.openingAt, 'openingAt'),
    technicianId: integer(value.technicianId, 'technicianId', {
      allowZero: true,
    }),
  };
}

function classificationRequest(
  body: unknown,
): TicketFacilityClassificationRequest {
  const value = recordBody(body);

  return {
    typeId: integer(value.typeId, 'typeId', { allowZero: true }),
    categoryId: integer(value.categoryId, 'categoryId'),
    subcategoryId: integer(value.subcategoryId, 'subcategoryId', {
      allowZero: true,
    }),
    levelId: integer(value.levelId, 'levelId', { allowZero: true }),
  };
}

function interactionRequest(body: unknown): TicketFacilityInteractionRequest {
  const value = recordBody(body);
  return { description: text(value.description, 'description') };
}

function assignmentRequest(body: unknown): TicketFacilityAssignmentRequest {
  const value = recordBody(body);
  return { technicianId: integer(value.technicianId, 'technicianId') };
}

function holdRequest(body: unknown): TicketFacilityHoldRequest {
  const value = recordBody(body);

  return {
    forecastAt: localDateTime(value.forecastAt, 'forecastAt'),
    description: text(value.description, 'description'),
  };
}

function rejectionRequest(body: unknown): TicketFacilityRejectionRequest {
  const value = recordBody(body);

  return {
    technicianId: integer(value.technicianId, 'technicianId', {
      allowZero: true,
    }),
    reason: text(value.reason, 'reason'),
  };
}

function finalizeRequest(body: unknown): TicketFacilityFinalizeRequest {
  const value = recordBody(body);
  return { description: text(value.description, 'description') };
}

@ApiTags('ticket-facility')
@Controller('tickets/facilities')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketFacilityController {
  constructor(private readonly commands: TicketFacilityCommands) {}

  @Post()
  @RequirePermissions(AppPermission.TicketsCreate)
  @ApiOperation({ summary: 'Criar atendimento Facility' })
  @ApiResponse({ status: 201, description: 'Atendimento Facility criado.' })
  async create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: unknown,
  ): Promise<TicketFacilityCreateResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return this.commands.create(user, createRequest(body));
  }

  @Patch(':facilityId/classification')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsClassify)
  @ApiOperation({ summary: 'Editar classificação do atendimento Facility' })
  @ApiResponse({ status: 204, description: 'Classificação atualizada.' })
  async classification(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('facilityId', ParseIntPipe) facilityId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    await this.commands.updateClassification(
      user,
      facilityId,
      classificationRequest(body),
    );
  }

  @Post(':facilityId/interactions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead)
  @ApiOperation({ summary: 'Adicionar interação ao atendimento Facility' })
  @ApiResponse({ status: 204, description: 'Interação registrada.' })
  async interaction(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('facilityId', ParseIntPipe) facilityId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = interactionRequest(body);
    await this.commands.addInteraction({
      user,
      facilityId,
      description: request.description,
    });
  }

  @Patch(':facilityId/assignment')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsExecute)
  @ApiOperation({ summary: 'Iniciar ou direcionar atendimento Facility' })
  @ApiResponse({ status: 204, description: 'Atribuição atualizada.' })
  async assignment(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('facilityId', ParseIntPipe) facilityId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = assignmentRequest(body);
    await this.commands.assign({
      user,
      facilityId,
      technicianId: request.technicianId,
    });
  }

  @Post(':facilityId/hold')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsHold)
  @ApiOperation({ summary: 'Colocar atendimento Facility em espera' })
  @ApiResponse({ status: 204, description: 'Atendimento colocado em espera.' })
  async hold(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('facilityId', ParseIntPipe) facilityId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = holdRequest(body);
    await this.commands.putOnHold({
      user,
      facilityId,
      forecastAt: request.forecastAt,
      description: request.description,
    });
  }

  @Post(':facilityId/resume')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsHold)
  @ApiOperation({ summary: 'Retomar atendimento Facility' })
  @ApiResponse({ status: 204, description: 'Atendimento retomado.' })
  async resume(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('facilityId', ParseIntPipe) facilityId: number,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    await this.commands.resume({ user, facilityId });
  }

  @Post(':facilityId/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsReject)
  @ApiOperation({ summary: 'Recusar ou redirecionar atendimento Facility' })
  @ApiResponse({ status: 204, description: 'Atendimento recusado/redirecionado.' })
  async reject(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('facilityId', ParseIntPipe) facilityId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = rejectionRequest(body);
    await this.commands.reject({
      user,
      facilityId,
      technicianId: request.technicianId,
      reason: request.reason,
    });
  }

  @Post(':facilityId/finalize')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsClose)
  @ApiOperation({ summary: 'Finalizar atendimento Facility' })
  @ApiResponse({ status: 204, description: 'Atendimento finalizado.' })
  async finalize(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('facilityId', ParseIntPipe) facilityId: number,
    @Body() body: unknown,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = finalizeRequest(body);
    await this.commands.finalize({
      user,
      facilityId,
      description: request.description,
    });
  }
}

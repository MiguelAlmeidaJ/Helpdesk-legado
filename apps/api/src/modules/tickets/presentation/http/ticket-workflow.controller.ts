import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
  type ConcludeTicketRequest,
  type FinalizeTicketRequest,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { ConcludeTicket } from '../../application/conclude-ticket';
import { FinalizeTicket } from '../../application/finalize-ticket';

function description(body: unknown): string {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Corpo da requisição inválido.');
  }
  const value = (body as Record<string, unknown>).description;
  if (typeof value !== 'string') {
    throw new BadRequestException('description é obrigatório.');
  }
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > 10_000) {
    throw new BadRequestException(
      'description deve ter entre 1 e 10000 caracteres.',
    );
  }
  return normalized;
}

@ApiTags('tickets')
@Controller('tickets/:id/workflow')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsRead, AppPermission.TicketsClose)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketWorkflowController {
  constructor(
    private readonly concludeTicket: ConcludeTicket,
    private readonly finalizeTicket: FinalizeTicket,
  ) {}

  @Post('conclude')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marcar atendimento como concluído' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['description'],
      properties: {
        description: { type: 'string', minLength: 1, maxLength: 10000 },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Atendimento concluído.' })
  @ApiResponse({ status: 403, description: 'Permissão ou origem inválida.' })
  @ApiResponse({ status: 409, description: 'Estado incompatível.' })
  async conclude(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() body: ConcludeTicketRequest,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    await this.concludeTicket.execute({
      user,
      ticketId,
      description: description(body),
    });
  }

  @Post('finalize')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Finalizar atendimento' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['description'],
      properties: {
        description: { type: 'string', minLength: 1, maxLength: 10000 },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Atendimento finalizado.' })
  @ApiResponse({ status: 403, description: 'Permissão ou origem inválida.' })
  @ApiResponse({ status: 409, description: 'Estado incompatível.' })
  async finalize(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() body: FinalizeTicketRequest,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException('Usuário não autenticado.');
    await this.finalizeTicket.execute({
      user,
      ticketId,
      description: description(body),
    });
  }
}

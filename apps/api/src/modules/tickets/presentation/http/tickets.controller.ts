import {
  BadRequestException,
  Body,
  Controller,
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
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppPermission,
  type TicketAssignmentOptionsResponse,
  type CreateTicketInteractionRequest,
  type RejectTicketRequest,
  type TicketDetailResponse,
  type TicketListResponse,
  type TicketRejectionOptionsResponse,
  type UpdateTicketAssignmentRequest,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { AddTicketInteraction } from '../../application/add-ticket-interaction';
import { GetTicketDetail } from '../../application/get-ticket-detail';
import { ListTicketAssignmentOptions } from '../../application/list-ticket-assignment-options';
import { ListTicketRejectionOptions } from '../../application/list-ticket-rejection-options';
import { ListTickets } from '../../application/list-tickets';
import { RejectTicket } from '../../application/reject-ticket';
import { UpdateTicketAssignment } from '../../application/update-ticket-assignment';
import { parseTicketListQuery } from './dto/list-tickets.query';

function interactionDescription(body: unknown): string {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Corpo da requisição inválido.');
  }

  const description = (body as Record<string, unknown>).description;

  if (typeof description !== 'string') {
    throw new BadRequestException('description é obrigatório.');
  }

  const normalized = description.trim();

  if (normalized.length < 1 || normalized.length > 10_000) {
    throw new BadRequestException(
      'description deve ter entre 1 e 10000 caracteres.',
    );
  }

  return normalized;
}

function assignmentTechnicianId(body: unknown): number {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Corpo da requisição inválido.');
  }

  const technicianId = (body as Record<string, unknown>).technicianId;

  if (
    typeof technicianId !== 'number' ||
    !Number.isSafeInteger(technicianId) ||
    technicianId < 1
  ) {
    throw new BadRequestException(
      'technicianId deve ser um inteiro positivo.',
    );
  }

  return technicianId;
}

function rejectionRequest(body: unknown): RejectTicketRequest {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Corpo da requisição inválido.');
  }

  const technicianId = (body as Record<string, unknown>).technicianId;
  const reason = (body as Record<string, unknown>).reason;

  if (
    typeof technicianId !== 'number' ||
    !Number.isSafeInteger(technicianId) ||
    technicianId < 0
  ) {
    throw new BadRequestException(
      'technicianId deve ser zero ou um inteiro positivo.',
    );
  }

  if (typeof reason !== 'string') {
    throw new BadRequestException('reason é obrigatório.');
  }

  const normalizedReason = reason.trim();

  if (normalizedReason.length < 1 || normalizedReason.length > 10_000) {
    throw new BadRequestException(
      'reason deve ter entre 1 e 10000 caracteres.',
    );
  }

  return {
    technicianId,
    reason: normalizedReason,
  };
}

@ApiTags('tickets')
@Controller('tickets')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsRead)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketsController {
  constructor(
    private readonly listTickets: ListTickets,
    private readonly getTicketDetail: GetTicketDetail,
    private readonly addTicketInteraction: AddTicketInteraction,
    private readonly listAssignmentOptions: ListTicketAssignmentOptions,
    private readonly updateTicketAssignment: UpdateTicketAssignment,
    private readonly listRejectionOptions: ListTicketRejectionOptions,
    private readonly rejectTicket: RejectTicket,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar atendimentos',
    description:
      'Read model paginado dos atendimentos com filtros, SLA, cards de status e opções de filtro.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Página, iniciando em 1.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 50,
    description: 'Itens por página. Máximo: 100.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    example: '1,2,3,5',
    description: 'Status separados por vírgula. Valores aceitos: 0 a 5.',
  })
  @ApiQuery({
    name: 'clientId',
    required: false,
    type: Number,
    description: 'ID do cliente.',
  })
  @ApiQuery({
    name: 'requesterId',
    required: false,
    type: Number,
    description: 'ID do solicitante. Aplicado quando clientId está informado.',
  })
  @ApiQuery({
    name: 'id',
    required: false,
    type: Number,
    description: 'ID exato do atendimento.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Busca nas descrições de abertura e fechamento.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    example: '0,1,2,3,4,5,6',
    description: 'Tipos de atendimento separados por vírgula.',
  })
  @ApiQuery({
    name: 'technicianId',
    required: false,
    type: String,
    example: '4,5',
    description: 'IDs de técnicos separados por vírgula.',
  })
  @ApiQuery({
    name: 'openedFrom',
    required: false,
    type: String,
    example: '2026-08-01',
    description: 'Data inicial de abertura no formato YYYY-MM-DD.',
  })
  @ApiQuery({
    name: 'openedTo',
    required: false,
    type: String,
    example: '2026-09-01',
    description: 'Data final de abertura no formato YYYY-MM-DD.',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    example: 'sla',
    enum: [
      'sla',
      'id',
      'client',
      'openedAt',
      'level',
      'priority',
      'technician',
      'status',
    ],
    description: 'Critério de ordenação.',
  })
  @ApiQuery({
    name: 'direction',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
    example: 'asc',
    description: 'Direção da ordenação.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista paginada de atendimentos, cards de status e opções de filtro.',
  })
  @ApiResponse({
    status: 400,
    description: 'Um ou mais parâmetros de filtro são inválidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário sem tickets.read para o escopo solicitado.',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: Record<string, unknown>,
  ): Promise<TicketListResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const parsed = parseTicketListQuery(query);

    return this.listTickets.execute({
      user,
      page: parsed.page,
      limit: parsed.limit,
      filters: parsed.filters,
    });
  }

  @Get('assignment/technicians')
  @RequirePermissions(
    AppPermission.TicketsRead,
    AppPermission.TicketsExecute,
  )
  @ApiOperation({
    summary: 'Listar técnicos para início ou direcionamento',
    description:
      'Retorna os técnicos disponíveis respeitando o escopo operacional do usuário.',
  })
  @ApiResponse({
    status: 200,
    description: 'Técnicos disponíveis para a operação.',
  })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário sem permissão para executar atendimentos.',
  })
  async assignmentTechnicians(
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<TicketAssignmentOptionsResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return this.listAssignmentOptions.execute(user);
  }

  @Get('rejection/technicians')
  @RequirePermissions(
    AppPermission.TicketsRead,
    AppPermission.TicketsReject,
  )
  @ApiOperation({
    summary: 'Listar destinos para recusa ou direcionamento',
    description:
      'Retorna Não atribuído e os usuários ativos que podem receber o atendimento após uma recusa.',
  })
  @ApiResponse({
    status: 200,
    description: 'Destinos disponíveis para a operação.',
  })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário sem permissão para recusar atendimentos.',
  })
  async rejectionTechnicians(
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<TicketRejectionOptionsResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return this.listRejectionOptions.execute(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter detalhe do atendimento',
    description:
      'Retorna os dados normalizados do atendimento e sua timeline de interações.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1234,
    description: 'ID do atendimento.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhe do atendimento.',
  })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário sem tickets.read para o escopo solicitado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Atendimento não encontrado ou fora do escopo do usuário.',
  })
  async detail(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) ticketId: number,
  ): Promise<TicketDetailResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return this.getTicketDetail.execute({
      user,
      ticketId,
    });
  }

  @Patch(':id/assignment')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(
    AppPermission.TicketsRead,
    AppPermission.TicketsExecute,
  )
  @ApiOperation({
    summary: 'Iniciar ou direcionar atendimento',
    description:
      'Ao selecionar o próprio usuário, inicia o atendimento. Ao selecionar outro usuário, mantém o atendimento aguardando e altera o técnico responsável.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1234,
    description: 'ID do atendimento.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['technicianId'],
      properties: {
        technicianId: {
          type: 'integer',
          minimum: 1,
          example: 15,
        },
      },
    },
  })
  @ApiResponse({
    status: 204,
    description: 'Atendimento iniciado ou direcionado.',
  })
  @ApiResponse({
    status: 400,
    description: 'Técnico ausente, inválido ou inativo.',
  })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário sem permissão ou fora do escopo operacional.',
  })
  @ApiResponse({
    status: 404,
    description: 'Atendimento não encontrado ou fora do escopo do usuário.',
  })
  @ApiResponse({
    status: 409,
    description: 'Atendimento não está mais aguardando execução.',
  })
  async assignment(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() body: UpdateTicketAssignmentRequest,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    await this.updateTicketAssignment.execute({
      user,
      ticketId,
      technicianId: assignmentTechnicianId(body),
    });
  }

  @Post(':id/rejection')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(
    AppPermission.TicketsRead,
    AppPermission.TicketsReject,
  )
  @ApiOperation({
    summary: 'Recusar ou redirecionar atendimento em execução',
    description:
      'Devolve o atendimento para aguardando execução, sem responsável ou direcionado a outro usuário, e registra a justificativa na timeline.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1234,
    description: 'ID do atendimento.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['technicianId', 'reason'],
      properties: {
        technicianId: {
          type: 'integer',
          minimum: 0,
          description:
            '0 devolve para a fila sem responsável; outro ID direciona o atendimento.',
          example: 0,
        },
        reason: {
          type: 'string',
          minLength: 1,
          maxLength: 10000,
          example: 'Necessário atendimento por técnico de infraestrutura.',
        },
      },
    },
  })
  @ApiResponse({
    status: 204,
    description: 'Atendimento devolvido para aguardando execução.',
  })
  @ApiResponse({
    status: 400,
    description: 'Destino ou justificativa inválidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário sem permissão ou fora do escopo operacional.',
  })
  @ApiResponse({
    status: 404,
    description: 'Atendimento não encontrado ou fora do escopo do usuário.',
  })
  @ApiResponse({
    status: 409,
    description: 'Atendimento não está mais em execução.',
  })
  async reject(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() body: RejectTicketRequest,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const request = rejectionRequest(body);

    await this.rejectTicket.execute({
      user,
      ticketId,
      technicianId: request.technicianId,
      reason: request.reason,
    });
  }

  @Post(':id/interactions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Adicionar interação ao atendimento',
    description:
      'Registra uma interação textual de tipo 7 no histórico do atendimento, preservando o escopo de leitura atual.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1234,
    description: 'ID do atendimento.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['description'],
      properties: {
        description: {
          type: 'string',
          minLength: 1,
          maxLength: 10000,
          example: 'Solicitante confirmou que o acesso voltou ao normal.',
        },
      },
    },
  })
  @ApiResponse({
    status: 204,
    description: 'Interação adicionada ao histórico.',
  })
  @ApiResponse({
    status: 400,
    description: 'Descrição ausente ou inválida.',
  })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário sem tickets.read para o escopo solicitado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Atendimento não encontrado ou fora do escopo do usuário.',
  })
  async addInteraction(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() body: CreateTicketInteractionRequest,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    await this.addTicketInteraction.execute({
      user,
      ticketId,
      description: interactionDescription(body),
    });
  }
}

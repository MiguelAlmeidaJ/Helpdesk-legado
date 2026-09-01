import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppPermission,
  type TicketListResponse,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { ListTickets } from '../../application/list-tickets';
import { parseTicketListQuery } from './dto/list-tickets.query';

@ApiTags('tickets')
@Controller('tickets')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsRead)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketsController {
  constructor(private readonly listTickets: ListTickets) {}

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
}

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
  type ImprovementListResponse,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { ListImprovements } from '../../application/list-improvements';
import { parseImprovementListQuery } from './dto/list-improvements.query';

@ApiTags('improvements')
@Controller('improvements')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsRead)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class ImprovementsController {
  constructor(private readonly listImprovements: ListImprovements) {}

  @Get()
  @ApiOperation({
    summary: 'Listar solicitações de melhoria',
    description:
      'Read model paginado da tabela legada melhorias, preservando filtros e visibilidade durante a migração para Nest/Next.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    example: '1,2,3,5',
    description: 'Status separados por vírgula. Valores aceitos: 0 a 5.',
  })
  @ApiQuery({ name: 'clientId', required: false, type: Number })
  @ApiQuery({ name: 'requesterId', required: false, type: Number })
  @ApiQuery({ name: 'id', required: false, type: Number })
  @ApiQuery({
    name: 'technicianId',
    required: false,
    type: String,
    example: '0,4,5',
  })
  @ApiQuery({
    name: 'openedFrom',
    required: false,
    type: String,
    example: '2026-09-01',
  })
  @ApiQuery({
    name: 'openedTo',
    required: false,
    type: String,
    example: '2026-09-30',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    enum: ['id', 'client', 'openedAt', 'level', 'form', 'technician', 'status'],
    example: 'status',
  })
  @ApiQuery({
    name: 'direction',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
    example: 'asc',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de melhorias, cards e opções de filtro.',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: Record<string, unknown>,
  ): Promise<ImprovementListResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const parsed = parseImprovementListQuery(query);
    return this.listImprovements.execute({
      user,
      page: parsed.page,
      limit: parsed.limit,
      filters: parsed.filters,
    });
  }
}

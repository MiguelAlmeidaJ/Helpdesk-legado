import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppPermission,
  type TicketProjectListResponse,
  type TicketProjectTaskListResponse,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { ListTicketProjects } from '../../application/list-ticket-projects';
import {
  parseTicketProjectQuery,
  parseTicketProjectTaskQuery,
} from './dto/list-ticket-projects.query';

@ApiTags('tickets')
@Controller('tickets/projects')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsRead)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketProjectsController {
  constructor(private readonly listTicketProjects: ListTicketProjects) {}

  @Get()
  @ApiOperation({ summary: 'Listar projetos da família de atendimentos' })
  projects(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: Record<string, unknown>,
  ): Promise<TicketProjectListResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const parsed = parseTicketProjectQuery(query);
    return this.listTicketProjects.projects({
      user,
      ...parsed,
    });
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Listar tarefas de projetos' })
  tasks(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: Record<string, unknown>,
  ): Promise<TicketProjectTaskListResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const parsed = parseTicketProjectTaskQuery(query);
    return this.listTicketProjects.tasks({
      user,
      ...parsed,
    });
  }

  @Get(':projectId/tasks')
  @ApiOperation({ summary: 'Listar tarefas de um projeto' })
  projectTasks(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() query: Record<string, unknown>,
  ): Promise<TicketProjectTaskListResponse> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const parsed = parseTicketProjectTaskQuery(query, projectId);
    return this.listTicketProjects.tasks({
      user,
      ...parsed,
    });
  }
}

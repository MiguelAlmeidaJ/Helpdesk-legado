import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  AppPermission,
  type TicketListResponse,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { ListTickets } from '../../application/list-tickets';
import { parseTicketListQuery } from './dto/list-tickets.query';

@Controller('tickets')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsRead)
export class TicketsController {
  constructor(private readonly listTickets: ListTickets) {}

  @Get()
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

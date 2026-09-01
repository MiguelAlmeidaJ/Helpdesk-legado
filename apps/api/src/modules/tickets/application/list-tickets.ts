import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  AppPermission,
  PermissionScope,
  type TicketListFilters,
  type TicketListResponse,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketsReadRepository } from './ports/tickets-read.repository';

export interface ListTicketsInput {
  user: AuthenticatedUser;
  filters: TicketListFilters;
  page: number;
  limit: number;
}

@Injectable()
export class ListTickets {
  constructor(private readonly repository: TicketsReadRepository) {}

  async execute(input: ListTicketsInput): Promise<TicketListResponse> {
    const systemAdmin = input.user.grants.find(
      (grant) => grant.permission === AppPermission.SystemAdmin,
    );
    const readGrant =
      systemAdmin ??
      input.user.grants.find(
        (grant) => grant.permission === AppPermission.TicketsRead,
      );

    if (!readGrant) {
      throw new ForbiddenException('Permissão insuficiente.');
    }

    if (readGrant.scope === PermissionScope.Sector) {
      throw new ForbiddenException(
        'O escopo de setor ainda não foi configurado para Atendimentos.',
      );
    }

    const ownerTechnicianId =
      readGrant.scope === PermissionScope.Own ? input.user.id : undefined;

    const result = await this.repository.list({
      userId: input.user.id,
      filters: input.filters,
      page: input.page,
      limit: input.limit,
      ownerTechnicianId,
    });

    return {
      data: result.data,
      meta: {
        page: input.page,
        limit: input.limit,
        total: result.total,
        totalPages:
          result.total === 0 ? 0 : Math.ceil(result.total / input.limit),
      },
      filters: input.filters,
      statusCards: result.statusCards,
      options: result.options,
    };
  }
}

import { Injectable } from '@nestjs/common';
import {
  type TicketListFilters,
  type TicketListResponse,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketsReadRepository } from './ports/tickets-read.repository';
import { resolveTicketReadAccess } from './ticket-read-access';

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
    const access = resolveTicketReadAccess(input.user);

    const result = await this.repository.list({
      userId: input.user.id,
      filters: input.filters,
      page: input.page,
      limit: input.limit,
      ownerTechnicianId: access.ownerTechnicianId,
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

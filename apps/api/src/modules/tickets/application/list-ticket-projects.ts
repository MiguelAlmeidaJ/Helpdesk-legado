import { Injectable } from '@nestjs/common';
import type {
  TicketProjectFilters,
  TicketProjectListResponse,
  TicketProjectTaskFilters,
  TicketProjectTaskListResponse,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketProjectReadRepository } from './ports/ticket-project-read.repository';
import { resolveTicketReadAccess } from './ticket-read-access';

interface ListTicketProjectInput<TFilters> {
  user: AuthenticatedUser;
  filters: TFilters;
  page: number;
  limit: number;
}

function meta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

@Injectable()
export class ListTicketProjects {
  constructor(private readonly repository: TicketProjectReadRepository) {}

  async projects(
    input: ListTicketProjectInput<TicketProjectFilters>,
  ): Promise<TicketProjectListResponse> {
    const access = resolveTicketReadAccess(input.user);
    const result = await this.repository.listProjects({
      userId: input.user.id,
      filters: input.filters,
      page: input.page,
      limit: input.limit,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    return {
      data: result.data,
      meta: meta(input.page, input.limit, result.total),
      filters: input.filters,
      options: result.options,
    };
  }

  async tasks(
    input: ListTicketProjectInput<TicketProjectTaskFilters>,
  ): Promise<TicketProjectTaskListResponse> {
    const access = resolveTicketReadAccess(input.user);
    const result = await this.repository.listTasks({
      userId: input.user.id,
      filters: input.filters,
      page: input.page,
      limit: input.limit,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    return {
      data: result.data,
      meta: meta(input.page, input.limit, result.total),
      filters: input.filters,
      options: result.options,
    };
  }
}

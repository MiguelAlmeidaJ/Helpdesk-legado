import { Injectable } from '@nestjs/common';
import type {
  ImprovementListFilters,
  ImprovementListResponse,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { resolveImprovementReadAccess } from './improvement-read-access';
import { ImprovementReadRepository } from './ports/improvement-read.repository';

export interface ListImprovementsInput {
  user: AuthenticatedUser;
  filters: ImprovementListFilters;
  page: number;
  limit: number;
}

@Injectable()
export class ListImprovements {
  constructor(private readonly repository: ImprovementReadRepository) {}

  async execute(input: ListImprovementsInput): Promise<ImprovementListResponse> {
    const access = resolveImprovementReadAccess(input.user);
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

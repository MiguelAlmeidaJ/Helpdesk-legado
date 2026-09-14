import type {
  ImprovementFilterOptions,
  ImprovementListFilters,
  ImprovementListItem,
  ImprovementStatusCard,
} from '@helpdesk/contracts';

export interface ImprovementReadRepositoryQuery {
  userId: number;
  filters: ImprovementListFilters;
  page: number;
  limit: number;
  ownerTechnicianId?: number;
}

export interface ImprovementReadRepositoryResult {
  data: ImprovementListItem[];
  total: number;
  statusCards: ImprovementStatusCard[];
  options: ImprovementFilterOptions;
}

export abstract class ImprovementReadRepository {
  abstract list(
    query: ImprovementReadRepositoryQuery,
  ): Promise<ImprovementReadRepositoryResult>;
}

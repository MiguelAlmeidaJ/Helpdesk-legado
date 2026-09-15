import type {
  CatalogCategoryOption,
  CatalogClientOption,
  CatalogSector,
  CatalogWriteInput,
} from '@helpdesk/contracts';

export interface CatalogListFilters {
  clientId?: number;
  categoryId?: number;
  search?: string;
  offset: number;
  limit: number;
}

export interface CatalogRecord {
  id: number;
  sector: CatalogSector;
  categoryId: number;
  categoryName: string | null;
  clientId: number;
  clientName: string | null;
  title: string;
  content: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  authorUserId: number;
}

export interface CatalogListResult {
  items: CatalogRecord[];
  hasMore: boolean;
}

export interface CatalogFilterOptions {
  categories: CatalogCategoryOption[];
  clients: CatalogClientOption[];
}

export interface CatalogWriteRecordInput extends CatalogWriteInput {
  authorUserId: number;
}

export abstract class CatalogRepository {
  abstract list(
    filters: CatalogListFilters,
    sectors: CatalogSector[],
  ): Promise<CatalogListResult>;

  abstract findById(
    id: number,
    sectors: CatalogSector[],
  ): Promise<CatalogRecord | null>;

  abstract filterOptions(): Promise<CatalogFilterOptions>;

  abstract resolveIds(
    clientId: number,
    categoryId: number,
    sectors: CatalogSector[],
  ): Promise<number[]>;

  abstract clientExists(clientId: number): Promise<boolean>;

  abstract categoryExists(categoryId: number): Promise<boolean>;

  abstract create(input: CatalogWriteRecordInput): Promise<CatalogRecord>;

  abstract update(
    id: number,
    input: CatalogWriteRecordInput,
  ): Promise<CatalogRecord>;
}

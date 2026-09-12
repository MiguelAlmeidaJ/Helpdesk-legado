export type CatalogSector = 1 | 2;

export interface CatalogListItem {
  id: number;
  sector: CatalogSector;
  categoryId: number;
  categoryName: string | null;
  clientId: number;
  clientName: string | null;
  title: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CatalogDetailResponse extends CatalogListItem {
  content: string;
  authorUserId: number;
}

export interface CatalogListResponse {
  items: CatalogListItem[];
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
}

export interface CatalogCategoryOption {
  id: number;
  name: string;
}

export interface CatalogClientOption {
  id: number;
  name: string | null;
}

export interface CatalogFiltersResponse {
  allowedSectors: CatalogSector[];
  categories: CatalogCategoryOption[];
  clients: CatalogClientOption[];
}

export type CatalogResolutionStatus = 'none' | 'single' | 'multiple';

export interface CatalogResolutionResponse {
  status: CatalogResolutionStatus;
  catalogIds: number[];
}

export interface CatalogWriteInput {
  sector: CatalogSector;
  categoryId: number;
  clientId: number;
  title: string;
  content: string;
}

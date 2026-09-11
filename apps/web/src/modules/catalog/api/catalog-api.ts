import type {
  CatalogDetailResponse,
  CatalogFiltersResponse,
  CatalogListResponse,
  CatalogResolutionResponse,
  CatalogSector,
  CatalogWriteInput,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export interface CatalogListQuery {
  search?: string;
  sector?: CatalogSector;
  clientId?: number;
  categoryId?: number;
  offset?: number;
  limit?: number;
}

function queryString(query: CatalogListQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.sector) params.set('sector', String(query.sector));
  if (query.clientId) params.set('clientId', String(query.clientId));
  if (query.categoryId) params.set('categoryId', String(query.categoryId));
  if (query.offset) params.set('offset', String(query.offset));
  if (query.limit) params.set('limit', String(query.limit));
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function fetchCatalogFilters(signal?: AbortSignal): Promise<CatalogFiltersResponse> {
  return apiRequest<CatalogFiltersResponse>('catalog/filters', { signal });
}

export function fetchCatalogs(
  query: CatalogListQuery,
  signal?: AbortSignal,
): Promise<CatalogListResponse> {
  return apiRequest<CatalogListResponse>(`catalog${queryString(query)}`, { signal });
}

export function resolveCatalogs(
  clientId: number,
  categoryId: number,
  sector?: CatalogSector,
  signal?: AbortSignal,
): Promise<CatalogResolutionResponse> {
  const params = new URLSearchParams({
    clientId: String(clientId),
    categoryId: String(categoryId),
  });
  if (sector) params.set('sector', String(sector));
  return apiRequest<CatalogResolutionResponse>(`catalog/resolve?${params.toString()}`, { signal });
}

export function fetchCatalog(id: number, signal?: AbortSignal): Promise<CatalogDetailResponse> {
  return apiRequest<CatalogDetailResponse>(`catalog/${id}`, { signal });
}

export function createCatalog(input: CatalogWriteInput): Promise<CatalogDetailResponse> {
  return apiRequest<CatalogDetailResponse>('catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateCatalog(
  id: number,
  input: CatalogWriteInput,
): Promise<CatalogDetailResponse> {
  return apiRequest<CatalogDetailResponse>(`catalog/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

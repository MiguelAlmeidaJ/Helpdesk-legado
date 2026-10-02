import type {
  TicketBreakdownLevel,
  TicketBreakdownMode,
  TicketBreakdownReportResponse,
  TicketCategoryTotalsLevel,
  TicketCategoryTotalsReportResponse,
  TicketClientTotalsLevel,
  TicketClientTotalsReportResponse,
  TicketTechnicianTotalsLevel,
  TicketTechnicianTotalsReportResponse,
  TicketAnalyticsResponse,
  TicketReportCatalog,
  TicketTechnicianTimingResponse,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export interface TicketCategoryTotalsReportFilters {
  startDate?: string;
  endDate?: string;
  clientId?: number;
  clientIds?: number[];
  technicianId?: number;
  categoryId?: number;
  status?: number;
  level?: TicketCategoryTotalsLevel;
}

export interface TicketClientTotalsReportFilters {
  startDate?: string;
  endDate?: string;
  clientId?: number;
  clientIds?: number[];
  technicianId?: number;
  categoryId?: number;
  status?: number;
  level?: TicketClientTotalsLevel;
}

export interface TicketTechnicianTotalsReportFilters {
  startDate?: string;
  endDate?: string;
  clientId?: number;
  clientIds?: number[];
  technicianId?: number;
  categoryId?: number;
  status?: number;
  level?: TicketTechnicianTotalsLevel;
}

function buildReportQuery(filters: {
  startDate?: string;
  endDate?: string;
  level?: number;
  clientId?: number;
  clientIds?: number[];
  technicianId?: number;
  categoryId?: number;
  status?: number;
}): string {
  const query = new URLSearchParams();

  if (filters.startDate) query.set('startDate', filters.startDate);
  if (filters.endDate) query.set('endDate', filters.endDate);
  if (filters.level !== undefined) query.set('level', String(filters.level));
  if (filters.clientIds?.length) {
    query.set('clientIds', filters.clientIds.join(','));
  }
  for (const key of ['clientId', 'technicianId', 'categoryId', 'status'] as const) {
    const value = filters[key];
    if (value) query.set(key, String(value));
  }

  return query.size > 0 ? `?${query.toString()}` : '';
}

export function fetchTicketCategoryTotalsReport(
  filters: TicketCategoryTotalsReportFilters = {},
): Promise<TicketCategoryTotalsReportResponse> {
  return apiRequest<TicketCategoryTotalsReportResponse>(
    `reports/tickets/category-totals${buildReportQuery(filters)}`,
  );
}

export function fetchTicketClientTotalsReport(
  filters: TicketClientTotalsReportFilters = {},
): Promise<TicketClientTotalsReportResponse> {
  return apiRequest<TicketClientTotalsReportResponse>(
    `reports/tickets/client-totals${buildReportQuery(filters)}`,
  );
}

export function fetchTicketTechnicianTotalsReport(
  filters: TicketTechnicianTotalsReportFilters = {},
): Promise<TicketTechnicianTotalsReportResponse> {
  return apiRequest<TicketTechnicianTotalsReportResponse>(
    `reports/tickets/technician-totals${buildReportQuery(filters)}`,
  );
}


export interface TicketBreakdownReportFilters {
  startDate?: string;
  endDate?: string;
  clientId?: number;
  clientIds?: number[];
  technicianId?: number;
  categoryId?: number;
  status?: number;
  level?: TicketBreakdownLevel;
}

export function fetchTicketBreakdownReport(
  mode: TicketBreakdownMode,
  filters: TicketBreakdownReportFilters = {},
): Promise<TicketBreakdownReportResponse> {
  return apiRequest<TicketBreakdownReportResponse>(
    `reports/tickets/breakdown/${mode}${buildReportQuery(filters)}`,
  );
}



export function fetchTicketReportCatalog(clientId = 0): Promise<TicketReportCatalog> {
  const query = clientId ? `?clientId=${clientId}` : '';
  return apiRequest<TicketReportCatalog>(`reports/tickets/catalog${query}`);
}

export function fetchTicketReportDetails(filters: {
  startDate: string;
  endDate: string;
  level?: number;
  clientId?: number;
  clientIds?: number[];
  technicianId?: number;
  categoryId?: number;
  status?: number;
}): Promise<TicketAnalyticsResponse> {
  const query = new URLSearchParams({
    source: 'tickets',
    view: 'analytics',
    startDate: filters.startDate,
    endDate: filters.endDate,
    level: String(filters.level ?? 0),
    clientId: String(filters.clientIds?.length ? 0 : (filters.clientId ?? 0)),
    clientIds: filters.clientIds?.join(',') ?? '',
    locationId: '0',
    technicianId: String(filters.technicianId ?? 0),
    categoryId: String(filters.categoryId ?? 0),
    status: String(filters.status ?? 0),
  });
  return apiRequest<TicketAnalyticsResponse>(
    `reports/tickets/analytics?${query.toString()}`,
  );
}


export interface TicketTechnicianTimingReportFilters {
  startDate?: string;
  endDate?: string;
  clientIds?: number[];
  technicianIds?: number[];
  level?: number;
}

export function fetchTicketTechnicianTimingReport(
  filters: TicketTechnicianTimingReportFilters = {},
): Promise<TicketTechnicianTimingResponse> {
  const query = new URLSearchParams();
  if (filters.startDate) query.set('startDate', filters.startDate);
  if (filters.endDate) query.set('endDate', filters.endDate);
  if (filters.clientIds?.length) {
    query.set('clientIds', filters.clientIds.join(','));
  }
  if (filters.technicianIds?.length) {
    query.set('technicianIds', filters.technicianIds.join(','));
  }
  if (filters.level) query.set('level', String(filters.level));
  const suffix = query.size ? `?${query.toString()}` : '';
  return apiRequest<TicketTechnicianTimingResponse>(
    `reports/tickets/technician-timing${suffix}`,
  );
}

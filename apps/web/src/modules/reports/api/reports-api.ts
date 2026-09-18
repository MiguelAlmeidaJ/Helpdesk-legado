import type {
  TicketCategoryTotalsLevel,
  TicketCategoryTotalsReportResponse,
  TicketClientTotalsLevel,
  TicketClientTotalsReportResponse,
  TicketTechnicianTotalsLevel,
  TicketTechnicianTotalsReportResponse,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export interface TicketCategoryTotalsReportFilters {
  startDate?: string;
  endDate?: string;
  level?: TicketCategoryTotalsLevel;
}

export interface TicketClientTotalsReportFilters {
  startDate?: string;
  endDate?: string;
  level?: TicketClientTotalsLevel;
}

export interface TicketTechnicianTotalsReportFilters {
  startDate?: string;
  endDate?: string;
  level?: TicketTechnicianTotalsLevel;
}

function buildReportQuery(filters: {
  startDate?: string;
  endDate?: string;
  level?: number;
}): string {
  const query = new URLSearchParams();

  if (filters.startDate) query.set('startDate', filters.startDate);
  if (filters.endDate) query.set('endDate', filters.endDate);
  if (filters.level !== undefined) query.set('level', String(filters.level));

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

import type {
  TicketClientTotalsLevel,
  TicketClientTotalsReportResponse,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export interface TicketClientTotalsReportFilters {
  startDate?: string;
  endDate?: string;
  level?: TicketClientTotalsLevel;
}

export function fetchTicketClientTotalsReport(
  filters: TicketClientTotalsReportFilters = {},
): Promise<TicketClientTotalsReportResponse> {
  const query = new URLSearchParams();

  if (filters.startDate) query.set('startDate', filters.startDate);
  if (filters.endDate) query.set('endDate', filters.endDate);
  if (filters.level !== undefined) query.set('level', String(filters.level));

  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiRequest<TicketClientTotalsReportResponse>(
    `reports/tickets/client-totals${suffix}`,
  );
}

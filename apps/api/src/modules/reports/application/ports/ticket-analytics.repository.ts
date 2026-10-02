import type { TicketAnalyticsFilters, TicketAnalyticsResponse, TicketReportCatalog, TicketTechnicianTimingFilters, TicketTechnicianTimingResponse, TechnicianWorkloadResponse } from '@helpdesk/contracts';

export abstract class TicketAnalyticsRepository {
  abstract analytics(userId: number, filters: TicketAnalyticsFilters): Promise<TicketAnalyticsResponse>;
  abstract catalog(userId: number, clientId: number): Promise<TicketReportCatalog>;
  abstract workload(userId: number): Promise<TechnicianWorkloadResponse>;
  abstract technicianTiming(userId: number, filters: TicketTechnicianTimingFilters): Promise<TicketTechnicianTimingResponse>;
}

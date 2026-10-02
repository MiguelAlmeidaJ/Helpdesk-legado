export type TicketReportSource = 'tickets' | 'tasks' | 'improvements' | 'unified';

export interface TicketAnalyticsFilters {
  view?: 'analytics' | 'time';
  startDate: string;
  endDate: string;
  source: TicketReportSource;
  clientId: number;
  clientIds: number[];
  locationId: number;
  technicianId: number;
  categoryId: number;
  categorySector: number;
  status: number;
  level: number;
}

export interface ReportOption { id: number; name: string }
export interface TicketReportCatalog {
  clients: ReportOption[];
  locations: ReportOption[];
  technicians: ReportOption[];
  categories: ReportOption[];
}

export interface TicketAnalyticsRow {
  id: number;
  source: Exclude<TicketReportSource, 'unified'>;
  clientId: number;
  clientName: string;
  locationName: string;
  locationAddress: string;
  requesterName: string;
  technicianName: string;
  categoryName: string;
  subcategoryName: string;
  itemName: string;
  type: number;
  level: number;
  method: number;
  status: number;
  openedAt: string;
  closedAt: string | null;
  openingDescription: string;
  closingDescription: string;
  elapsedSeconds: number;
}

export interface TicketAnalyticsResponse {
  filters: TicketAnalyticsFilters;
  generatedAt: string;
  total: number;
  rows: TicketAnalyticsRow[];
}

export interface TechnicianWorkloadRow {
  technicianId: number;
  technicianName: string;
  open: number;
  waiting: number;
  overdue: number;
  elapsedSeconds: number;
}
export interface TechnicianWorkloadResponse {
  generatedAt: string;
  rows: TechnicianWorkloadRow[];
}


export interface TicketTechnicianTimingFilters {
  startDate: string;
  endDate: string;
  clientIds: number[];
  technicianIds: number[];
  level: number;
}

export interface TicketTechnicianTimingRow {
  technicianId: number;
  technicianName: string;
  ticketCount: number;
  acceptedCount: number;
  completedCount: number;
  averageAcceptanceSeconds: number | null;
  averageResolutionSeconds: number | null;
  averageHandlingSeconds: number | null;
  maxAcceptanceSeconds: number | null;
  maxResolutionSeconds: number | null;
}

export interface TicketTechnicianTimingDetail {
  ticketId: number;
  clientId: number;
  clientName: string;
  requesterName: string;
  technicianId: number;
  technicianName: string;
  level: number;
  status: number;
  openedAt: string;
  acceptedAt: string | null;
  closedAt: string | null;
  acceptanceSeconds: number | null;
  resolutionSeconds: number | null;
  handlingSeconds: number | null;
}

export interface TicketTechnicianTimingResponse {
  filters: TicketTechnicianTimingFilters;
  generatedAt: string;
  totalTickets: number;
  acceptedTickets: number;
  completedTickets: number;
  averageAcceptanceSeconds: number | null;
  averageResolutionSeconds: number | null;
  averageHandlingSeconds: number | null;
  rows: TicketTechnicianTimingRow[];
  details: TicketTechnicianTimingDetail[];
}

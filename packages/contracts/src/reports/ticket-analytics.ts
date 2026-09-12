export type TicketReportSource = 'tickets' | 'tasks' | 'improvements' | 'unified';

export interface TicketAnalyticsFilters {
  view?: 'analytics' | 'time';
  startDate: string;
  endDate: string;
  source: TicketReportSource;
  clientId: number;
  locationId: number;
  technicianId: number;
  level: number;
}

export interface ReportOption { id: number; name: string }
export interface TicketReportCatalog {
  clients: ReportOption[];
  locations: ReportOption[];
  technicians: ReportOption[];
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

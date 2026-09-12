import type { TicketStatus } from './ticket-status';

export type TechnicianAvailabilityState = 'available' | 'busy' | 'offline';

export interface TicketAvailabilityTicket {
  id: number;
  status: TicketStatus;
  statusLabel: string;
  typeId: number | null;
  typeLabel: string;
  priorityId: number | null;
  clientName: string | null;
  technicianId: number | null;
  technicianName: string | null;
  openedAt: string | null;
  closedAt: string | null;
  waitingCount: number;
  holdCause: string | null;
  holdDescription: string | null;
  holdForecastAt: string | null;
}

export interface TechnicianAvailabilityItem {
  id: number;
  name: string;
  functionId: number;
  online: boolean;
  state: TechnicianAvailabilityState;
  executing: TicketAvailabilityTicket[];
}

export interface TicketAvailabilityHoldGroup {
  cause: string;
  tickets: TicketAvailabilityTicket[];
}

export interface TicketAvailabilitySummary {
  scheduled: number;
  waitingExecution: number;
  inProgress: number;
  onHold: number;
  finishedToday: number;
  onlineTechnicians: number;
  availableTechnicians: number;
  busyTechnicians: number;
}

export interface TicketAvailabilityResponse {
  generatedAt: string;
  onlineWindowMinutes: 10;
  summary: TicketAvailabilitySummary;
  technicians: TechnicianAvailabilityItem[];
  scheduled: TicketAvailabilityTicket[];
  waitingExecution: TicketAvailabilityTicket[];
  finishedToday: TicketAvailabilityTicket[];
  holds: TicketAvailabilityHoldGroup[];
}

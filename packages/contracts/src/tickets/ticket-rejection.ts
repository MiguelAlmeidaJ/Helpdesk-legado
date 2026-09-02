import type { TicketAssignmentOption } from './ticket-assignment';

export interface TicketRejectionOptionsResponse {
  technicians: TicketAssignmentOption[];
}

export interface RejectTicketRequest {
  technicianId: number;
  reason: string;
}

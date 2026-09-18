export interface TicketAssignmentOption {
  id: number;
  name: string;
}

export interface TicketAssignmentOptionsResponse {
  technicians: TicketAssignmentOption[];
}

export interface UpdateTicketAssignmentRequest {
  technicianId: number;
}

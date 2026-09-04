import type { TicketStatus } from './ticket-status';

export interface TicketTimelineParty {
  id: number | null;
  name: string | null;
}

export interface TicketTimelineClassification {
  category: string | null;
  subcategory: string | null;
  item: string | null;
}

export interface TicketTimelineEntry {
  interactionId: number;
  ticketId: number;
  interactionType: number;
  occurredAt: string;
  description: string;
  ticketStatus: TicketStatus | null;
  actor: TicketTimelineParty;
  client: TicketTimelineParty;
  requester: TicketTimelineParty;
  technician: TicketTimelineParty;
  location: string | null;
  classification: TicketTimelineClassification;
}

export interface TicketTimelineResponse {
  windowHours: 24;
  generatedAt: string;
  items: TicketTimelineEntry[];
}

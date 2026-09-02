export const TICKET_NOTIFICATION_EVENT_TYPES = [
  'ticket.opened',
  'ticket.on_hold',
  'ticket.resumed',
  'ticket.concluded',
  'ticket.finalized',
] as const;

export type TicketNotificationEventType =
  (typeof TICKET_NOTIFICATION_EVENT_TYPES)[number];

export interface TicketNotificationPayload {
  actorUserId?: number;
  automatic?: boolean;
  cause?: string;
  description?: string;
  forecastAt?: string;
  openingAt?: string;
  status?: number;
}

export interface TicketNotificationOutboxEvent {
  id: string;
  ticketId: number;
  eventType: TicketNotificationEventType;
  payload: TicketNotificationPayload;
}

export interface TicketNotificationContext {
  ticketId: number;
  clientName: string | null;
  clientEmail: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  technicianName: string | null;
  technicianEmail: string | null;
}

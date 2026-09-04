import type {
  TicketNotificationContext,
  TicketNotificationOutboxEvent,
} from '../../domain/ticket-notification';

export abstract class TicketNotificationOutboxRepository {
  abstract findPending(limit: number): Promise<TicketNotificationOutboxEvent[]>;
  abstract claim(eventId: string): Promise<boolean>;
  abstract context(ticketId: number): Promise<TicketNotificationContext | null>;
  abstract complete(eventId: string): Promise<void>;
  abstract fail(eventId: string, message: string, retrySeconds: number): Promise<void>;
}

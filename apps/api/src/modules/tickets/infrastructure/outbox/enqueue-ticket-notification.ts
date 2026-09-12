import { randomUUID } from 'node:crypto';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import type {
  TicketNotificationEventType,
  TicketNotificationPayload,
} from '../../domain/ticket-notification';

type OutboxTransaction = Pick<Nivel3DatabaseClient, '$executeRawUnsafe'>;

export async function enqueueTicketNotification(
  transaction: OutboxTransaction,
  eventType: TicketNotificationEventType,
  ticketId: number,
  payload: TicketNotificationPayload = {},
): Promise<void> {
  const id = randomUUID();

  await transaction.$executeRawUnsafe(
    `INSERT INTO api_outbox_events (
       id,
       idempotency_key,
       aggregate_type,
       aggregate_id,
       event_type,
       payload,
       available_at,
       created_at
     )
     VALUES (?, ?, 'ticket', ?, ?, ?, NOW(6), NOW(6))`,
    id,
    `ticket:${ticketId}:${eventType}:${id}`,
    String(ticketId),
    eventType,
    JSON.stringify(payload),
  );
}

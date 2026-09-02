import { Inject, Injectable } from '@nestjs/common';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import { TicketNotificationOutboxRepository } from '../../application/ports/ticket-notification-outbox.repository';
import {
  TICKET_NOTIFICATION_EVENT_TYPES,
  type TicketNotificationContext,
  type TicketNotificationEventType,
  type TicketNotificationOutboxEvent,
  type TicketNotificationPayload,
} from '../../domain/ticket-notification';

interface EventRow {
  id: string;
  aggregate_id: string;
  event_type: string;
  payload: string;
}

interface TicketContextRow {
  ticket_id: number;
  client_name: string | null;
  client_email: string | null;
  requester_name: string | null;
  requester_email: string | null;
  technician_name: string | null;
  technician_email: string | null;
}

function parsePayload(raw: string): TicketNotificationPayload {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as TicketNotificationPayload)
      : {};
  } catch {
    return {};
  }
}

@Injectable()
export class PrismaTicketNotificationOutboxRepository extends TicketNotificationOutboxRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {
    super();
  }

  async findPending(limit: number): Promise<TicketNotificationOutboxEvent[]> {
    const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
    const placeholders = TICKET_NOTIFICATION_EVENT_TYPES.map(() => '?').join(', ');

    const rows = await this.database.$queryRawUnsafe<EventRow[]>(
      `SELECT id, aggregate_id, event_type, payload
       FROM api_outbox_events
       WHERE aggregate_type = 'ticket'
         AND event_type IN (${placeholders})
         AND processed_at IS NULL
         AND available_at <= NOW(6)
         AND (
           claimed_at IS NULL
           OR claimed_at < DATE_SUB(NOW(6), INTERVAL 10 MINUTE)
         )
       ORDER BY available_at ASC, created_at ASC
       LIMIT ${safeLimit}`,
      ...TICKET_NOTIFICATION_EVENT_TYPES,
    );

    return rows
      .map((row) => {
        const ticketId = Number(row.aggregate_id);
        if (!Number.isSafeInteger(ticketId) || ticketId <= 0) return null;
        return {
          id: row.id,
          ticketId,
          eventType: row.event_type as TicketNotificationEventType,
          payload: parsePayload(row.payload),
        };
      })
      .filter((event): event is TicketNotificationOutboxEvent => event !== null);
  }

  async claim(eventId: string): Promise<boolean> {
    const updated = await this.database.$executeRawUnsafe(
      `UPDATE api_outbox_events
       SET claimed_at = NOW(6),
           attempts = attempts + 1
       WHERE id = ?
         AND processed_at IS NULL
         AND available_at <= NOW(6)
         AND (
           claimed_at IS NULL
           OR claimed_at < DATE_SUB(NOW(6), INTERVAL 10 MINUTE)
         )`,
      eventId,
    );
    return updated > 0;
  }

  async context(ticketId: number): Promise<TicketNotificationContext | null> {
    const rows = await this.database.$queryRawUnsafe<TicketContextRow[]>(
      `SELECT
         a.id AS ticket_id,
         COALESCE(NULLIF(c.clt_nomef, ''), c.clt_nomer) AS client_name,
         c.clt_mail AS client_email,
         p.pessoa_nom AS requester_name,
         p.pessoa_mail AS requester_email,
         u.user_nome AS technician_name,
         u.user_mail AS technician_email
       FROM atendimentos a
       LEFT JOIN clientes c ON c.clt_id = a.cliente
       LEFT JOIN pessoas p ON p.pessoa_id = a.pessoa
       LEFT JOIN usuarios u ON u.user_id = a.tecnico
       WHERE a.id = ?
       LIMIT 1`,
      ticketId,
    );

    const row = rows[0];
    if (!row) return null;

    return {
      ticketId: row.ticket_id,
      clientName: row.client_name,
      clientEmail: row.client_email,
      requesterName: row.requester_name,
      requesterEmail: row.requester_email,
      technicianName: row.technician_name,
      technicianEmail: row.technician_email,
    };
  }

  async complete(eventId: string): Promise<void> {
    await this.database.$executeRawUnsafe(
      `UPDATE api_outbox_events
       SET processed_at = NOW(6),
           claimed_at = NULL,
           last_error = NULL
       WHERE id = ?`,
      eventId,
    );
  }

  async fail(eventId: string, message: string, retrySeconds: number): Promise<void> {
    await this.database.$executeRawUnsafe(
      `UPDATE api_outbox_events
       SET claimed_at = NULL,
           last_error = ?,
           available_at = TIMESTAMPADD(SECOND, ?, NOW(6))
       WHERE id = ?
         AND processed_at IS NULL`,
      message.slice(0, 1000),
      Math.max(30, Math.min(86_400, Math.trunc(retrySeconds))),
      eventId,
    );
  }
}

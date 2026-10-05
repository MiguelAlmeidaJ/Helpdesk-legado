import { Inject, Injectable } from '@nestjs/common';
import {
  AppPermission,
  TicketStatus,
  type AppNotificationItem,
  type NotificationCenterResponse,
  type TicketListItem,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { ListTickets } from '../../tickets/application/list-tickets';

interface ReadStateRow {
  notification_key: string;
  read_at: Date | string | null;
}

const WARNING_WINDOW_SECONDS = 15 * 60;
const MAX_ITEMS = 40;

function hasPermission(user: AuthenticatedUser, permission: AppPermission): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === permission,
  );
}

function occurred(value: string | null): string | null {
  return value;
}

function ticketHref(ticketId: number): string {
  return `/atendimentos/${ticketId}`;
}

function ticketLabel(ticket: TicketListItem): string {
  const client = ticket.client.name?.trim();
  return client ? `#${ticket.id} · ${client}` : `Atendimento #${ticket.id}`;
}

function ticketNotifications(
  ticket: TicketListItem,
  user: AuthenticatedUser,
  now: number,
): AppNotificationItem[] {
  const items: AppNotificationItem[] = [];
  const href = ticketHref(ticket.id);
  const label = ticketLabel(ticket);

  const qualityBreached = ticket.sla.quality.breached;
  const clerioBreached = ticket.sla.clerio.breached;

  if (ticket.status !== TicketStatus.OnHold && (qualityBreached || clerioBreached)) {
    const names = [
      qualityBreached ? 'Qualidade' : '',
      clerioBreached ? 'Clerio' : '',
    ].filter(Boolean);

    items.push({
      key: `ticket:${ticket.id}:sla:critical:${names.join('+').toLowerCase()}`,
      severity: 'critical',
      source: 'ticket',
      sourceId: String(ticket.id),
      title:
        names.length > 1
          ? 'SLAs do atendimento estourados'
          : `SLA ${names[0]} estourado`,
      message: `${label} ultrapassou o limite configurado.`,
      href,
      occurredAt: occurred(ticket.sla.lastActivityAt ?? ticket.openedAt),
      read: false,
    });
  } else if (ticket.status !== TicketStatus.OnHold) {
    const qualityRemaining = ticket.sla.quality.remainingSeconds;
    const clerioRemaining = ticket.sla.clerio.remainingSeconds;
    const remaining = Math.min(
      qualityRemaining >= 0 ? qualityRemaining : Number.POSITIVE_INFINITY,
      clerioRemaining >= 0 ? clerioRemaining : Number.POSITIVE_INFINITY,
    );

    if (Number.isFinite(remaining) && remaining <= WARNING_WINDOW_SECONDS) {
      const minutes = Math.max(0, Math.ceil(remaining / 60));
      items.push({
        key: `ticket:${ticket.id}:sla:warning`,
        severity: 'warning',
        source: 'ticket',
        sourceId: String(ticket.id),
        title: 'SLA próximo do limite',
        message: `${label} tem aproximadamente ${minutes} min antes do próximo limite.`,
        href,
        occurredAt: occurred(ticket.sla.lastActivityAt ?? ticket.openedAt),
        read: false,
      });
    }
  }

  if (
    ticket.status === TicketStatus.OnHold &&
    ticket.sla.latestWait.scheduledResumeAt
  ) {
    const resumeAt = new Date(ticket.sla.latestWait.scheduledResumeAt).getTime();

    if (Number.isFinite(resumeAt) && resumeAt <= now) {
      items.push({
        key: `ticket:${ticket.id}:hold:overdue`,
        severity: 'warning',
        source: 'ticket',
        sourceId: String(ticket.id),
        title: 'Retorno de espera vencido',
        message: `${label} já atingiu a previsão de retorno da espera.`,
        href,
        occurredAt: ticket.sla.latestWait.scheduledResumeAt,
        read: false,
      });
    }
  }

  if (
    ticket.status === TicketStatus.WaitingExecution &&
    ticket.technician.id === user.id
  ) {
    items.push({
      key: `ticket:${ticket.id}:assigned:waiting`,
      severity: 'info',
      source: 'ticket',
      sourceId: String(ticket.id),
      title: 'Atendimento direcionado para você',
      message: `${label} está aguardando sua execução.`,
      href,
      occurredAt: ticket.openedAt,
      read: false,
    });
  }

  return items;
}

function severityOrder(item: AppNotificationItem): number {
  if (item.severity === 'critical') return 0;
  if (item.severity === 'warning') return 1;
  return 2;
}

@Injectable()
export class NotificationCenterService {
  private notificationStateReady: Promise<void> | null = null;

  constructor(
    private readonly listTickets: ListTickets,
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async list(user: AuthenticatedUser): Promise<NotificationCenterResponse> {
    const generatedAt = new Date().toISOString();
    let items: AppNotificationItem[] = [];

    if (hasPermission(user, AppPermission.TicketsRead)) {
      const tickets = await this.listTickets.execute({
        user,
        page: 1,
        limit: 100,
        filters: {
          statuses: [
            TicketStatus.WaitingExecution,
            TicketStatus.InProgress,
            TicketStatus.OnHold,
          ],
          typeIds: [],
          technicianIds: [],
          sort: 'sla',
          direction: 'asc',
        },
      });

      const now = Date.now();
      items = tickets.data.flatMap((ticket) =>
        ticketNotifications(ticket, user, now),
      );
    }

    items.sort((left, right) => {
      const severity = severityOrder(left) - severityOrder(right);
      if (severity !== 0) return severity;
      return String(right.occurredAt ?? '').localeCompare(
        String(left.occurredAt ?? ''),
      );
    });

    items = items.slice(0, MAX_ITEMS);

    const readKeys = await this.readKeys(
      user.id,
      items.map((item) => item.key),
    );

    items = items.map((item) => ({
      ...item,
      read: readKeys.has(item.key),
    }));

    return {
      unreadCount: items.filter((item) => !item.read).length,
      total: items.length,
      generatedAt,
      items,
    };
  }

  async markRead(userId: number, keys: string[]): Promise<void> {
    await this.ensureNotificationStateTable();
    for (const key of keys) {
      await this.database.$executeRawUnsafe(
        `INSERT INTO notification_states
           (user_id, notification_key, read_at, updated_at)
         VALUES (?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE read_at = NOW(), updated_at = NOW()`,
        userId,
        key,
      );
    }
  }

  private ensureNotificationStateTable(): Promise<void> {
    if (!this.notificationStateReady) {
      this.notificationStateReady = this.database
        .$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS notification_states (
             user_id INT NOT NULL,
             notification_key VARCHAR(190) NOT NULL,
             read_at DATETIME NULL,
             updated_at DATETIME NOT NULL
               DEFAULT CURRENT_TIMESTAMP
               ON UPDATE CURRENT_TIMESTAMP,
             PRIMARY KEY (user_id, notification_key),
             KEY idx_notification_states_user_read (user_id, read_at)
           ) ENGINE=InnoDB
             DEFAULT CHARSET=utf8mb4
             COLLATE=utf8mb4_unicode_ci`,
        )
        .then(() => undefined)
        .catch((error) => {
          this.notificationStateReady = null;
          throw error;
        });
    }
    return this.notificationStateReady;
  }

  private async readKeys(userId: number, keys: string[]): Promise<Set<string>> {
    if (keys.length === 0) return new Set();
    await this.ensureNotificationStateTable();

    const placeholders = keys.map(() => '?').join(', ');
    const rows = await this.database.$queryRawUnsafe<ReadStateRow[]>(
      `SELECT notification_key, read_at
       FROM notification_states
       WHERE user_id = ?
         AND notification_key IN (${placeholders})
         AND read_at IS NOT NULL`,
      userId,
      ...keys,
    );

    return new Set(rows.map((row) => row.notification_key));
  }
}

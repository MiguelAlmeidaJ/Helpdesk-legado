import { Injectable } from '@nestjs/common';
import { TicketNotificationOutboxRepository } from './ports/ticket-notification-outbox.repository';
import { TicketNotificationMailer } from '../infrastructure/notification/ticket-notification.mailer';

export interface ProcessTicketNotificationOutboxResult {
  candidates: number;
  sent: number;
  withoutRecipients: number;
  skipped: number;
  failed: number;
}

function retrySeconds(eventId: string): number {
  let seed = 0;
  for (const char of eventId) seed = (seed * 31 + char.charCodeAt(0)) % 300;
  return 60 + seed;
}

@Injectable()
export class ProcessTicketNotificationOutbox {
  constructor(
    private readonly repository: TicketNotificationOutboxRepository,
    private readonly mailer: TicketNotificationMailer,
  ) {}

  async execute(limit: number): Promise<ProcessTicketNotificationOutboxResult> {
    const events = await this.repository.findPending(limit);
    let sent = 0;
    let withoutRecipients = 0;
    let skipped = 0;
    let failed = 0;

    for (const event of events) {
      if (!(await this.repository.claim(event.id))) {
        skipped += 1;
        continue;
      }

      try {
        const context = await this.repository.context(event.ticketId);
        if (!context) {
          await this.repository.complete(event.id);
          skipped += 1;
          continue;
        }

        const recipients = this.mailer.recipients(context);
        if (recipients.length === 0) {
          await this.repository.complete(event.id);
          withoutRecipients += 1;
          continue;
        }

        await this.mailer.send(event, context, recipients);
        await this.repository.complete(event.id);
        sent += 1;
      } catch (error: unknown) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        await this.repository.fail(event.id, message, retrySeconds(event.id));
      }
    }

    return { candidates: events.length, sent, withoutRecipients, skipped, failed };
  }
}

import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ProcessTicketNotificationOutbox } from '../../application/process-ticket-notification-outbox';
import { TicketNotificationMailer } from '../notification/ticket-notification.mailer';

const DEFAULT_INTERVAL_MS = 30_000;
const MIN_INTERVAL_MS = 10_000;
const MAX_INTERVAL_MS = 3_600_000;
const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 200;
const HEARTBEAT_EVERY_IDLE_RUNS = 20;

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed)
    ? Math.max(minimum, Math.min(maximum, parsed))
    : fallback;
}

@Injectable()
export class TicketNotificationOutboxPoller
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TicketNotificationOutboxPoller.name);
  private readonly requested = enabled(process.env.TICKET_NOTIFICATION_EMAIL_ENABLED);
  private readonly intervalMs = boundedInteger(
    process.env.TICKET_NOTIFICATION_EMAIL_INTERVAL_MS,
    DEFAULT_INTERVAL_MS,
    MIN_INTERVAL_MS,
    MAX_INTERVAL_MS,
  );
  private readonly batchSize = boundedInteger(
    process.env.TICKET_NOTIFICATION_EMAIL_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
    1,
    MAX_BATCH_SIZE,
  );

  private timer: NodeJS.Timeout | null = null;
  private activeRun: Promise<void> | null = null;
  private idleRuns = 0;
  private running = false;

  constructor(
    private readonly processOutbox: ProcessTicketNotificationOutbox,
    private readonly mailer: TicketNotificationMailer,
  ) {}

  onApplicationBootstrap(): void {
    this.running = this.requested && this.mailer.isConfigured();

    if (this.running) {
      this.logger.log(
        `Outbox de e-mail habilitada: intervalo=${this.intervalMs}ms, lote=${this.batchSize}.`,
      );
      this.trigger();
    } else if (this.requested) {
      this.logger.error(
        'Outbox de e-mail solicitada, mas SMTP_HOST/SMTP_FROM não estão configurados. Eventos permanecerão pendentes.',
      );
    } else {
      this.logger.warn(
        'Envio de notificações de atendimento desabilitado. Eventos continuarão sendo gravados na outbox.',
      );
    }

    this.timer = setInterval(() => this.trigger(), this.intervalMs);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.activeRun) await this.activeRun;
  }

  private trigger(): void {
    if (!this.running || this.activeRun) return;
    this.activeRun = this.runOnce().finally(() => {
      this.activeRun = null;
    });
  }

  private async runOnce(): Promise<void> {
    try {
      const startedAt = Date.now();
      const result = await this.processOutbox.execute(this.batchSize);
      const elapsedMs = Date.now() - startedAt;

      if (result.candidates === 0) {
        this.idleRuns += 1;
        if (this.idleRuns % HEARTBEAT_EVERY_IDLE_RUNS === 0) {
          this.logger.log(
            `Outbox de tickets saudável: sem eventos pendentes; último ciclo=${elapsedMs}ms.`,
          );
        }
        return;
      }

      this.idleRuns = 0;
      this.logger.log(
        `Outbox de tickets: candidatos=${result.candidates}, enviados=${result.sent}, sem-destinatario=${result.withoutRecipients}, ignorados=${result.skipped}, falhas=${result.failed}, duracao=${elapsedMs}ms.`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.error(`Falha ao processar outbox de tickets: ${message}`);
    }
  }
}

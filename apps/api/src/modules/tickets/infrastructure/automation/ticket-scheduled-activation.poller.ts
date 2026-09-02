import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ActivateDueScheduledTickets } from '../../application/activate-due-scheduled-tickets';

const DEFAULT_INTERVAL_MS = 60_000;
const MIN_INTERVAL_MS = 10_000;
const MAX_INTERVAL_MS = 3_600_000;
const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;

function envEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed)) {
    return fallback;
  }

  return Math.max(minimum, Math.min(maximum, parsed));
}

@Injectable()
export class TicketScheduledActivationPoller
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TicketScheduledActivationPoller.name);
  private readonly enabled = envEnabled(
    process.env.TICKET_SCHEDULED_ACTIVATION_ENABLED,
  );
  private readonly intervalMs = boundedInteger(
    process.env.TICKET_SCHEDULED_ACTIVATION_INTERVAL_MS,
    DEFAULT_INTERVAL_MS,
    MIN_INTERVAL_MS,
    MAX_INTERVAL_MS,
  );
  private readonly batchSize = boundedInteger(
    process.env.TICKET_SCHEDULED_ACTIVATION_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
    1,
    MAX_BATCH_SIZE,
  );

  private timer: NodeJS.Timeout | null = null;
  private activeRun: Promise<void> | null = null;

  constructor(
    private readonly activateDueScheduledTickets: ActivateDueScheduledTickets,
  ) {}

  onApplicationBootstrap(): void {
    if (this.enabled) {
      this.logger.log(
        `Ativacao de agendados habilitada: intervalo=${this.intervalMs}ms, lote=${this.batchSize}.`,
      );
      this.trigger();
    } else {
      this.logger.warn('Ativacao automatica de chamados agendados desabilitada.');
    }

    this.timer = setInterval(() => this.trigger(), this.intervalMs);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.activeRun) {
      await this.activeRun;
    }
  }

  private trigger(): void {
    if (!this.enabled || this.activeRun) {
      return;
    }

    this.activeRun = this.runOnce().finally(() => {
      this.activeRun = null;
    });
  }

  private async runOnce(): Promise<void> {
    try {
      const result = await this.activateDueScheduledTickets.execute(
        this.batchSize,
      );

      if (result.activated > 0 || result.skipped > 0) {
        this.logger.log(
          `Agendados vencidos: candidatos=${result.candidates}, ativados=${result.activated}, ignorados=${result.skipped}.`,
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.stack ?? error.message : String(error);

      this.logger.error(`Falha ao ativar chamados agendados: ${message}`);
    }
  }
}

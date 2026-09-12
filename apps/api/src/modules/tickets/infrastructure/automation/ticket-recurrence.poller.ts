import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ProcessDueTicketRecurrences } from '../../application/process-due-ticket-recurrences';

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
export class TicketRecurrencePoller
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TicketRecurrencePoller.name);
  private readonly enabled = envEnabled(process.env.TICKET_RECURRENCE_ENABLED);
  private readonly intervalMs = boundedInteger(
    process.env.TICKET_RECURRENCE_INTERVAL_MS,
    DEFAULT_INTERVAL_MS,
    MIN_INTERVAL_MS,
    MAX_INTERVAL_MS,
  );
  private readonly batchSize = boundedInteger(
    process.env.TICKET_RECURRENCE_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
    1,
    MAX_BATCH_SIZE,
  );

  private timer: NodeJS.Timeout | null = null;
  private activeRun: Promise<void> | null = null;

  constructor(
    private readonly processDueTicketRecurrences: ProcessDueTicketRecurrences,
  ) {}

  onApplicationBootstrap(): void {
    if (this.enabled) {
      this.logger.log(
        `Recorrencias habilitadas: intervalo=${this.intervalMs}ms, lote=${this.batchSize}.`,
      );
      this.trigger();
    } else {
      this.logger.warn('Processamento automatico de recorrencias desabilitado.');
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
      const result = await this.processDueTicketRecurrences.execute(
        this.batchSize,
      );

      if (result.created > 0 || result.skipped > 0 || result.invalid > 0) {
        this.logger.log(
          `Recorrencias: candidatos=${result.candidates}, criados=${result.created}, ignorados=${result.skipped}, invalidos=${result.invalid}.`,
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.stack ?? error.message : String(error);

      this.logger.error(`Falha ao processar recorrencias: ${message}`);
    }
  }
}

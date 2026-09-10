import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { CleanupExpiredReports } from '../../application/cleanup-expired-reports';

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = 60_000;
const MAX_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

function envEnabled(value: string | undefined, fallback = true): boolean {
  if (!value?.trim()) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return fallback;
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, parsed));
}

@Injectable()
export class ReportRetentionPoller
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ReportRetentionPoller.name);
  private readonly enabled = envEnabled(process.env.REPORT_CLEANUP_ENABLED);
  private readonly intervalMs = boundedInteger(
    process.env.REPORT_CLEANUP_INTERVAL_MS,
    DEFAULT_INTERVAL_MS,
    MIN_INTERVAL_MS,
    MAX_INTERVAL_MS,
  );

  private timer: NodeJS.Timeout | null = null;
  private activeRun: Promise<void> | null = null;

  constructor(private readonly cleanupExpiredReports: CleanupExpiredReports) {}

  onApplicationBootstrap(): void {
    if (!this.enabled) {
      this.logger.warn('Limpeza automática de relatórios gerados desabilitada.');
      return;
    }

    this.logger.log(
      `Limpeza automática de relatórios habilitada: intervalo=${this.intervalMs}ms.`,
    );
    this.trigger();
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
    if (this.activeRun) return;

    this.activeRun = this.runOnce().finally(() => {
      this.activeRun = null;
    });
  }

  private async runOnce(): Promise<void> {
    try {
      const result = await this.cleanupExpiredReports.execute();

      if (result.removed > 0) {
        this.logger.log(
          `Relatórios expirados removidos: ${result.removed}; retenção=${result.retentionDays} dias; limite=${result.before.toISOString()}.`,
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.error(`Falha ao limpar relatórios expirados: ${message}`);
    }
  }
}

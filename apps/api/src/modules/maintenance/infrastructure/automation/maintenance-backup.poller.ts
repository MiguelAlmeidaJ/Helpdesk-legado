import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { MaintenanceService } from '../../application/maintenance.service';

const DEFAULT_INTERVAL_MS = 30_000;
const MIN_INTERVAL_MS = 10_000;
const MAX_INTERVAL_MS = 300_000;

function enabled(): boolean {
  const value = process.env.MAINTENANCE_BACKUP_WORKER_ENABLED?.trim().toLowerCase();
  return value === undefined || value === '' || value === 'true';
}

function intervalMs(): number {
  const parsed = Number(
    process.env.MAINTENANCE_BACKUP_WORKER_INTERVAL_MS ?? DEFAULT_INTERVAL_MS,
  );
  if (!Number.isSafeInteger(parsed)) return DEFAULT_INTERVAL_MS;
  return Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, parsed));
}

@Injectable()
export class MaintenanceBackupPoller
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MaintenanceBackupPoller.name);
  private readonly active = enabled();
  private readonly interval = intervalMs();
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<void> | null = null;

  constructor(private readonly maintenance: MaintenanceService) {}

  onApplicationBootstrap(): void {
    if (!this.active) {
      this.logger.warn('Worker de backup administrativo desabilitado.');
      return;
    }

    this.logger.log(
      'Worker de backup administrativo habilitado: intervalo=' +
        this.interval +
        'ms.',
    );
    this.trigger();
    this.timer = setInterval(() => this.trigger(), this.interval);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.running) await this.running;
  }

  private trigger(): void {
    if (!this.active || this.running) return;
    this.running = this.run().finally(() => {
      this.running = null;
    });
  }

  private async run(): Promise<void> {
    try {
      await this.maintenance.heartbeatWorker();
      const completed = await this.maintenance.runDueBackupJobs();
      if (completed > 0) {
        this.logger.log('Jobs de backup executados: ' + completed + '.');
      }
    } catch (error) {
      this.logger.error(
        'Falha no worker de backup: ' +
          (error instanceof Error ? error.stack ?? error.message : String(error)),
      );
    }
  }
}

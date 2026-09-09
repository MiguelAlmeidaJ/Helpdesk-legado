import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { MarketingTickets } from '../application/marketing-tickets';

const DEFAULT_INTERVAL_MS = 60_000;
const MIN_INTERVAL_MS = 5_000;

@Injectable()
export class MarketingTicketScheduleRunner
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MarketingTicketScheduleRunner.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly tickets: MarketingTickets) {}

  onModuleInit(): void {
    const intervalMs = this.intervalMs();
    if (intervalMs === 0) {
      this.logger.log('Ativação automática de tickets Marketing desabilitada.');
      return;
    }

    void this.tick();
    this.timer = setInterval(() => void this.tick(), intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.tickets.activateDue();
      if (result.activated > 0) {
        this.logger.log(
          `Agendamentos Marketing ativados: ${result.activated} ticket(s).`,
        );
      }
      if (result.truncated) {
        this.logger.warn(
          'Limite de ativação Marketing atingido; o próximo ciclo continuará o processamento.',
        );
      }
    } catch (error) {
      const detail = error instanceof Error ? error.stack : String(error);
      this.logger.error('Falha ao ativar tickets Marketing agendados.', detail);
    } finally {
      this.running = false;
    }
  }

  private intervalMs(): number {
    const raw = process.env.TICKET_MARKETING_SCHEDULE_ACTIVATION_INTERVAL_MS?.trim();
    if (raw === '0') return 0;
    if (!raw) return DEFAULT_INTERVAL_MS;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < MIN_INTERVAL_MS) {
      this.logger.warn(
        `TICKET_MARKETING_SCHEDULE_ACTIVATION_INTERVAL_MS inválido (${raw}); usando ${DEFAULT_INTERVAL_MS}ms.`,
      );
      return DEFAULT_INTERVAL_MS;
    }
    return Math.trunc(parsed);
  }
}

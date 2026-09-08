import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { TicketProjectScheduleActivation } from '../../application/ticket-project-schedule-activation';

const DEFAULT_INTERVAL_MS = 60_000;
const MIN_INTERVAL_MS = 5_000;

@Injectable()
export class TicketProjectScheduleActivationRunner
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    TicketProjectScheduleActivationRunner.name,
  );
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly activation: TicketProjectScheduleActivation,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.intervalMs();
    if (intervalMs === 0) {
      this.logger.log('Ativação automática de projetos/tarefas desabilitada.');
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
      const result = await this.activation.execute();
      if (result.tasksActivated > 0 || result.projectsActivated > 0) {
        this.logger.log(
          `Agendamentos ativados: ${result.projectsActivated} projeto(s), ` +
            `${result.tasksActivated} tarefa(s).`,
        );
      }
      if (result.truncated) {
        this.logger.warn(
          'Limite de ativação por ciclo atingido; o próximo ciclo continuará o processamento.',
        );
      }
    } catch (error) {
      const detail = error instanceof Error ? error.stack : String(error);
      this.logger.error('Falha ao ativar projetos/tarefas agendados.', detail);
    } finally {
      this.running = false;
    }
  }

  private intervalMs(): number {
    const raw = process.env.TICKET_PROJECT_SCHEDULE_ACTIVATION_INTERVAL_MS?.trim();
    if (raw === '0') return 0;
    if (!raw) return DEFAULT_INTERVAL_MS;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < MIN_INTERVAL_MS) {
      this.logger.warn(
        `TICKET_PROJECT_SCHEDULE_ACTIVATION_INTERVAL_MS inválido (${raw}); ` +
          `usando ${DEFAULT_INTERVAL_MS}ms.`,
      );
      return DEFAULT_INTERVAL_MS;
    }

    return Math.trunc(parsed);
  }
}

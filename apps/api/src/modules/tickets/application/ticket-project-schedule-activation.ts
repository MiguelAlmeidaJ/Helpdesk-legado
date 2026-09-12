import { Injectable } from '@nestjs/common';
import { TicketProjectScheduleActivationRepository } from './ports/ticket-project-schedule-activation.repository';

const SYSTEM_ACTOR_USER_ID = 1;
const BATCH_SIZE = 200;
const MAX_BATCHES_PER_RUN = 20;

export interface TicketProjectScheduleActivationResult {
  tasksActivated: number;
  projectsActivated: number;
  truncated: boolean;
}

@Injectable()
export class TicketProjectScheduleActivation {
  constructor(
    private readonly repository: TicketProjectScheduleActivationRepository,
  ) {}

  async execute(): Promise<TicketProjectScheduleActivationResult> {
    let tasksActivated = 0;
    let projectsActivated = 0;
    let taskBatchFull = false;
    let projectBatchFull = false;

    for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
      const activated = await this.repository.activateDueTasks({
        systemActorUserId: SYSTEM_ACTOR_USER_ID,
        batchSize: BATCH_SIZE,
      });
      tasksActivated += activated;
      taskBatchFull = activated === BATCH_SIZE;
      if (!taskBatchFull) break;
    }

    for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
      const activated = await this.repository.activateDueProjects({
        systemActorUserId: SYSTEM_ACTOR_USER_ID,
        batchSize: BATCH_SIZE,
      });
      projectsActivated += activated;
      projectBatchFull = activated === BATCH_SIZE;
      if (!projectBatchFull) break;
    }

    return {
      tasksActivated,
      projectsActivated,
      truncated: taskBatchFull || projectBatchFull,
    };
  }
}

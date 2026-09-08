export interface TicketProjectScheduleActivationInput {
  systemActorUserId: number;
  batchSize: number;
}

export abstract class TicketProjectScheduleActivationRepository {
  abstract activateDueTasks(
    input: TicketProjectScheduleActivationInput,
  ): Promise<number>;

  abstract activateDueProjects(
    input: TicketProjectScheduleActivationInput,
  ): Promise<number>;
}

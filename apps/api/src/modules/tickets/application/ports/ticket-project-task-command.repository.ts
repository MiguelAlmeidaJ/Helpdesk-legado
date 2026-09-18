export type TicketProjectTaskCommandResult =
  | 'updated'
  | 'not-found'
  | 'invalid-state';

export type TicketProjectTaskAssignmentResult =
  | TicketProjectTaskCommandResult
  | 'invalid-technician'
  | 'blocked-by-dependency';

export type TicketProjectTaskHoldResult =
  | TicketProjectTaskCommandResult
  | 'already-on-hold';

export type TicketProjectTaskResumeResult =
  | TicketProjectTaskCommandResult
  | 'missing-active-hold';

export type TicketProjectTaskRejectionResult =
  | TicketProjectTaskCommandResult
  | 'invalid-technician';

export interface TicketProjectTaskCommandScope {
  taskId: number;
  actorUserId: number;
  ownerTechnicianId?: number;
}

export interface TicketProjectTaskInteractionPersistenceInput
  extends TicketProjectTaskCommandScope {
  description: string;
}

export interface TicketProjectTaskAssignmentPersistenceInput
  extends TicketProjectTaskCommandScope {
  technicianId: number;
}

export interface TicketProjectTaskHoldPersistenceInput
  extends TicketProjectTaskCommandScope {
  forecastAt: string;
  description: string;
}

export interface TicketProjectTaskRejectionPersistenceInput
  extends TicketProjectTaskCommandScope {
  technicianId: number;
  reason: string;
}

export interface TicketProjectTaskFinalizePersistenceInput
  extends TicketProjectTaskCommandScope {
  description: string;
  allowedStatuses: number[];
}

export interface TicketProjectTaskProgressPersistenceInput
  extends TicketProjectTaskCommandScope {
  progress: number;
}

export abstract class TicketProjectTaskCommandRepository {
  abstract addInteraction(
    input: TicketProjectTaskInteractionPersistenceInput,
  ): Promise<TicketProjectTaskCommandResult>;

  abstract assign(
    input: TicketProjectTaskAssignmentPersistenceInput,
  ): Promise<TicketProjectTaskAssignmentResult>;

  abstract putOnHold(
    input: TicketProjectTaskHoldPersistenceInput,
  ): Promise<TicketProjectTaskHoldResult>;

  abstract resume(
    input: TicketProjectTaskCommandScope,
  ): Promise<TicketProjectTaskResumeResult>;

  abstract reject(
    input: TicketProjectTaskRejectionPersistenceInput,
  ): Promise<TicketProjectTaskRejectionResult>;

  abstract finalize(
    input: TicketProjectTaskFinalizePersistenceInput,
  ): Promise<TicketProjectTaskCommandResult>;

  abstract updateProgress(
    input: TicketProjectTaskProgressPersistenceInput,
  ): Promise<TicketProjectTaskCommandResult>;
}

export type TicketProjectCommandResult =
  | 'updated'
  | 'not-found'
  | 'invalid-state';

export type TicketProjectAssignmentResult =
  | TicketProjectCommandResult
  | 'invalid-technician';

export type TicketProjectHoldResult =
  | TicketProjectCommandResult
  | 'already-on-hold';

export type TicketProjectResumeResult =
  | TicketProjectCommandResult
  | 'missing-active-hold';

export type TicketProjectRejectionResult =
  | TicketProjectCommandResult
  | 'invalid-technician';

export interface TicketProjectCommandScope {
  projectId: number;
  actorUserId: number;
  ownerTechnicianId?: number;
}

export interface TicketProjectInteractionPersistenceInput
  extends TicketProjectCommandScope {
  description: string;
}

export interface TicketProjectAssignmentPersistenceInput
  extends TicketProjectCommandScope {
  technicianId: number;
}

export interface TicketProjectHoldPersistenceInput
  extends TicketProjectCommandScope {
  forecastAt: string;
  description: string;
}

export interface TicketProjectRejectionPersistenceInput
  extends TicketProjectCommandScope {
  technicianId: number;
  reason: string;
}

export interface TicketProjectFinalizePersistenceInput
  extends TicketProjectCommandScope {
  description: string;
  allowedStatuses: number[];
}

export abstract class TicketProjectCommandRepository {
  abstract addInteraction(
    input: TicketProjectInteractionPersistenceInput,
  ): Promise<TicketProjectCommandResult>;

  abstract assign(
    input: TicketProjectAssignmentPersistenceInput,
  ): Promise<TicketProjectAssignmentResult>;

  abstract putOnHold(
    input: TicketProjectHoldPersistenceInput,
  ): Promise<TicketProjectHoldResult>;

  abstract resume(
    input: TicketProjectCommandScope,
  ): Promise<TicketProjectResumeResult>;

  abstract reject(
    input: TicketProjectRejectionPersistenceInput,
  ): Promise<TicketProjectRejectionResult>;

  abstract finalize(
    input: TicketProjectFinalizePersistenceInput,
  ): Promise<TicketProjectCommandResult>;
}

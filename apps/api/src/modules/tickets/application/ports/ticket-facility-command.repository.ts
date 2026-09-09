import type {
  TicketFacilityClassificationRequest,
  TicketFacilityCreateRequest,
  TicketFacilityCreateResponse,
} from '@helpdesk/contracts';

export type TicketFacilityCommandResult =
  | 'updated'
  | 'not-found'
  | 'invalid-state';

export type TicketFacilityCreatePersistenceResult =
  | TicketFacilityCreateResponse
  | 'forbidden-client'
  | 'invalid-reference';

export type TicketFacilityClassificationResult =
  | TicketFacilityCommandResult
  | 'invalid-reference';

export type TicketFacilityAssignmentResult =
  | TicketFacilityCommandResult
  | 'invalid-technician';

export type TicketFacilityHoldResult =
  | TicketFacilityCommandResult
  | 'already-on-hold';

export type TicketFacilityResumeResult =
  | TicketFacilityCommandResult
  | 'missing-active-hold';

export type TicketFacilityRejectionResult =
  | TicketFacilityCommandResult
  | 'invalid-technician';

export interface TicketFacilityCommandScope {
  facilityId: number;
  actorUserId: number;
  ownerTechnicianId?: number;
}

export interface CreateTicketFacilityPersistenceInput {
  actorUserId: number;
  data: TicketFacilityCreateRequest;
}

export interface UpdateTicketFacilityClassificationPersistenceInput
  extends TicketFacilityCommandScope {
  data: TicketFacilityClassificationRequest;
}

export interface TicketFacilityInteractionPersistenceInput
  extends TicketFacilityCommandScope {
  description: string;
}

export interface TicketFacilityAssignmentPersistenceInput
  extends TicketFacilityCommandScope {
  technicianId: number;
}

export interface TicketFacilityHoldPersistenceInput
  extends TicketFacilityCommandScope {
  forecastAt: string;
  description: string;
}

export interface TicketFacilityRejectionPersistenceInput
  extends TicketFacilityCommandScope {
  technicianId: number;
  reason: string;
}

export interface TicketFacilityFinalizePersistenceInput
  extends TicketFacilityCommandScope {
  description: string;
  allowedStatuses: number[];
}

export abstract class TicketFacilityCommandRepository {
  abstract create(
    input: CreateTicketFacilityPersistenceInput,
  ): Promise<TicketFacilityCreatePersistenceResult>;

  abstract updateClassification(
    input: UpdateTicketFacilityClassificationPersistenceInput,
  ): Promise<TicketFacilityClassificationResult>;

  abstract addInteraction(
    input: TicketFacilityInteractionPersistenceInput,
  ): Promise<TicketFacilityCommandResult>;

  abstract assign(
    input: TicketFacilityAssignmentPersistenceInput,
  ): Promise<TicketFacilityAssignmentResult>;

  abstract putOnHold(
    input: TicketFacilityHoldPersistenceInput,
  ): Promise<TicketFacilityHoldResult>;

  abstract resume(
    input: TicketFacilityCommandScope,
  ): Promise<TicketFacilityResumeResult>;

  abstract reject(
    input: TicketFacilityRejectionPersistenceInput,
  ): Promise<TicketFacilityRejectionResult>;

  abstract finalize(
    input: TicketFacilityFinalizePersistenceInput,
  ): Promise<TicketFacilityCommandResult>;
}

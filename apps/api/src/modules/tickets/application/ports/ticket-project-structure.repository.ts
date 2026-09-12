import type {
  TicketProjectCreateRequest,
  TicketProjectCreateResponse,
  TicketProjectTaskCreateRequest,
  TicketProjectTaskCreateResponse,
  TicketProjectTaskUpdateRequest,
  TicketProjectUpdateRequest,
} from '@helpdesk/contracts';

export type TicketProjectCreatePersistenceResult =
  | TicketProjectCreateResponse
  | 'forbidden-client'
  | 'invalid-reference';

export type TicketProjectTaskCreatePersistenceResult =
  | TicketProjectTaskCreateResponse
  | 'not-found'
  | 'invalid-state'
  | 'invalid-reference'
  | 'invalid-dependency';

export type TicketProjectStructurePersistenceResult =
  | 'updated'
  | 'not-found'
  | 'invalid-reference';

export type TicketProjectTaskDependencyPersistenceResult =
  | TicketProjectStructurePersistenceResult
  | 'invalid-dependency'
  | 'dependency-cycle';

export interface TicketProjectStructureScope {
  actorUserId: number;
  ownerTechnicianId?: number;
}

export interface CreateTicketProjectPersistenceInput
  extends TicketProjectStructureScope {
  data: TicketProjectCreateRequest;
}

export interface UpdateTicketProjectPersistenceInput
  extends TicketProjectStructureScope {
  projectId: number;
  data: TicketProjectUpdateRequest;
}

export interface CreateTicketProjectTaskPersistenceInput
  extends TicketProjectStructureScope {
  projectId: number;
  data: TicketProjectTaskCreateRequest;
}

export interface UpdateTicketProjectTaskPersistenceInput
  extends TicketProjectStructureScope {
  taskId: number;
  data: TicketProjectTaskUpdateRequest;
}

export interface UpdateTicketProjectTaskDependencyPersistenceInput
  extends TicketProjectStructureScope {
  taskId: number;
  dependencyTaskId: number;
}

export abstract class TicketProjectStructureRepository {
  abstract createProject(
    input: CreateTicketProjectPersistenceInput,
  ): Promise<TicketProjectCreatePersistenceResult>;

  abstract updateProject(
    input: UpdateTicketProjectPersistenceInput,
  ): Promise<TicketProjectStructurePersistenceResult>;

  abstract createTask(
    input: CreateTicketProjectTaskPersistenceInput,
  ): Promise<TicketProjectTaskCreatePersistenceResult>;

  abstract updateTask(
    input: UpdateTicketProjectTaskPersistenceInput,
  ): Promise<TicketProjectStructurePersistenceResult>;

  abstract updateTaskDependency(
    input: UpdateTicketProjectTaskDependencyPersistenceInput,
  ): Promise<TicketProjectTaskDependencyPersistenceResult>;
}

import type { PaginatedResponse } from '../common/pagination';
import type {
  SortDirection,
  TicketFilterOptions,
  TicketListParty,
} from './ticket-list';

export type TicketProjectStatus = 0 | 1 | 2 | 3 | 4;

export type TicketProjectSort =
  | 'id'
  | 'client'
  | 'openedAt'
  | 'level'
  | 'form'
  | 'technician'
  | 'status';

export type TicketProjectTaskSort = TicketProjectSort | 'project';

export interface TicketProjectFilters {
  statuses: TicketProjectStatus[];
  clientId?: number;
  requesterId?: number;
  technicianId?: number;
  id?: number;
  search?: string;
  openedFrom?: string;
  openedTo?: string;
  sort: TicketProjectSort;
  direction: SortDirection;
}

export interface TicketProjectTaskFilters
  extends Omit<TicketProjectFilters, 'sort'> {
  projectId?: number;
  sort: TicketProjectTaskSort;
}

export interface TicketProjectListItem {
  id: number;
  name: string;
  openingDescription: string | null;
  openedAt: string | null;
  status: TicketProjectStatus;
  statusLabel: string;
  typeId: number | null;
  level: number | null;
  form: number | null;
  client: TicketListParty;
  requester: TicketListParty;
  location: TicketListParty;
  category: TicketListParty;
  subcategory: TicketListParty;
  item: TicketListParty;
  technician: TicketListParty;
  waitSeconds: number;
  lastActivityAt: string | null;
}

export interface TicketProjectTaskListItem {
  id: number;
  project: TicketListParty;
  name: string;
  openingDescription: string | null;
  closingDescription: string | null;
  openedAt: string | null;
  closedAt: string | null;
  days: number | null;
  status: TicketProjectStatus;
  statusLabel: string;
  typeId: number | null;
  dependencyTaskId: number;
  level: number | null;
  form: number | null;
  client: TicketListParty;
  requester: TicketListParty;
  location: TicketListParty;
  category: TicketListParty;
  subcategory: TicketListParty;
  item: TicketListParty;
  technician: TicketListParty;
  waitSeconds: number;
  lastActivityAt: string | null;
}

export interface TicketProjectListResponse
  extends PaginatedResponse<TicketProjectListItem> {
  filters: TicketProjectFilters;
  options: TicketFilterOptions;
}

export interface TicketProjectTaskListResponse
  extends PaginatedResponse<TicketProjectTaskListItem> {
  filters: TicketProjectTaskFilters;
  options: TicketFilterOptions;
}

export interface TicketProjectInteractionRequest {
  description: string;
}

export interface TicketProjectAssignmentRequest {
  technicianId: number;
}

export interface TicketProjectHoldRequest {
  forecastAt: string;
  description: string;
}

export interface TicketProjectRejectionRequest {
  technicianId: number;
  reason: string;
}

export interface TicketProjectFinalizeRequest {
  description: string;
}

export interface TicketProjectTaskInteractionRequest {
  description: string;
}

export interface TicketProjectTaskAssignmentRequest {
  technicianId: number;
}

export interface TicketProjectTaskHoldRequest {
  forecastAt: string;
  description: string;
}

export interface TicketProjectTaskRejectionRequest {
  technicianId: number;
  reason: string;
}

export interface TicketProjectTaskFinalizeRequest {
  description: string;
}

export interface TicketProjectTaskProgressRequest {
  progress: number;
}

export interface TicketProjectCreateRequest {
  name: string;
  clientId: number;
  requesterId: number;
  locationId: number;
  typeId: number;
  categoryId: number;
  subcategoryId: number;
  itemId: number;
  levelId: number;
  formId: number;
  openingDescription: string;
  openingAt: string;
  technicianId: number;
}

export interface TicketProjectCreateResponse {
  id: number;
  status: TicketProjectStatus;
}

export interface TicketProjectUpdateRequest {
  typeId: number;
  categoryId: number;
  subcategoryId: number;
  itemId: number;
  levelId: number;
  formId: number;
  openingDescription: string;
}

export interface TicketProjectTaskCreateRequest {
  name: string;
  requesterId: number;
  locationId: number;
  typeId: number;
  categoryId: number;
  subcategoryId: number;
  itemId: number;
  levelId: number;
  formId: number;
  openingDescription: string;
  openingAt: string;
  technicianId: number;
  days: number;
  dependencyTaskId: number;
}

export interface TicketProjectTaskCreateResponse {
  id: number;
  status: TicketProjectStatus;
}

export interface TicketProjectTaskUpdateRequest {
  typeId: number;
  categoryId: number;
  subcategoryId: number;
  itemId: number;
  levelId: number;
  formId: number;
  openingDescription: string;
}

export interface TicketProjectTaskDependencyRequest {
  dependencyTaskId: number;
}

/**
 * Ticket DevOps sem agrupamento em projeto. Mantém os mesmos campos do
 * cadastro legado de atd_projeto/tarefa.php.
 */
export type DevOpsTicketCreateRequest = TicketProjectCreateRequest;

export interface DevOpsTicketCreateResponse {
  id: number;
  status: TicketProjectStatus;
  projectId: null;
}

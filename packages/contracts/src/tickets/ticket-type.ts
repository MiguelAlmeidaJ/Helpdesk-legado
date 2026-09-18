import type { Sector } from '../auth/sector';

export type TicketTypeKey = 'atendimento' | 'devops' | 'marketing';

export type TicketTypeFieldKey =
  | 'name'
  | 'clientId'
  | 'requesterId'
  | 'locationId'
  | 'typeId'
  | 'categoryId'
  | 'subcategoryId'
  | 'itemId'
  | 'levelId'
  | 'priorityId'
  | 'formId'
  | 'openingDescription'
  | 'openingAt'
  | 'technicianId'
  | 'recurrence'
  | 'projectId'
  | 'days'
  | 'dependencyTaskId';

export interface TicketTypeCapabilities {
  sla: boolean;
  scheduledOpening: boolean;
  recurrence: boolean;
  priority: boolean;
  projects: boolean;
  taskDependencies: boolean;
  progress: boolean;
  taskImages: boolean;
}

export interface TicketTypeDescriptor {
  key: TicketTypeKey;
  label: string;
  description: string;
  serviceSectors: Sector[];
  capabilities: TicketTypeCapabilities;
  requiredFields: TicketTypeFieldKey[];
  optionalFields: TicketTypeFieldKey[];
  canCreate: boolean;
}

export interface TicketTypesResponse {
  ticketTypes: TicketTypeDescriptor[];
}

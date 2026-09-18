import type {
  TicketRecurrenceClientOption,
  TicketRecurrenceItem,
  TicketRecurrenceMutationRequest,
  TicketRecurrenceMutationResponse,
  TicketRecurrenceStatusFilter,
} from '@helpdesk/contracts';

export interface TicketRecurrenceManagementListQuery {
  userId: number;
  clientId?: number;
  period?: number;
  status: TicketRecurrenceStatusFilter;
}

export abstract class TicketRecurrenceManagementRepository {
  abstract list(query: TicketRecurrenceManagementListQuery): Promise<TicketRecurrenceItem[]>;
  abstract clients(userId: number): Promise<TicketRecurrenceClientOption[]>;
  abstract create(userId: number, input: TicketRecurrenceMutationRequest): Promise<TicketRecurrenceMutationResponse>;
  abstract update(userId: number, recurrenceId: number, input: TicketRecurrenceMutationRequest): Promise<void>;
  abstract setActive(userId: number, recurrenceId: number, active: boolean): Promise<void>;
}

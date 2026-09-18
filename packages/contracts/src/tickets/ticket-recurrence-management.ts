export type TicketRecurrencePeriod = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type TicketRecurrenceQuantityMode = 'fixa' | 'continua';
export type TicketRecurrenceStatusFilter = 'ativas' | 'inativas' | 'todos';

export interface TicketRecurrenceClientOption {
  id: number;
  name: string;
}

export interface TicketRecurrenceItem {
  id: number;
  modelTicketId: number;
  name: string;
  clientId: number;
  clientName: string;
  period: TicketRecurrencePeriod;
  periodLabel: string;
  nextAt: string;
  quantityMode: TicketRecurrenceQuantityMode;
  quantityTotal: number | null;
  quantityRemaining: number;
  active: boolean;
  week: number | null;
}

export interface TicketRecurrenceListResponse {
  data: TicketRecurrenceItem[];
  clients: TicketRecurrenceClientOption[];
  periods: Array<{ id: TicketRecurrencePeriod; name: string }>;
  total: number;
}

export interface TicketRecurrenceMutationRequest {
  name: string;
  clientId: number;
  period: TicketRecurrencePeriod;
  nextAt: string;
  quantityMode: TicketRecurrenceQuantityMode;
  quantity?: number | null;
}

export interface TicketRecurrenceMutationResponse {
  id: number;
  modelTicketId: number;
}

export interface TicketRecurrenceToggleRequest {
  active: boolean;
}

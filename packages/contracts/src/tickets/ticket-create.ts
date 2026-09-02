import type { TicketCatalogOption } from './ticket-classification';

export interface TicketCreateCatalogsResponse {
  clients: TicketCatalogOption[];
  technicians: TicketCatalogOption[];
}

export interface CreateTicketRequest {
  clientId: number;
  requesterId: number;
  locationId: number;
  typeId: number;
  categoryId: number;
  subcategoryId: number;
  itemId: number;
  levelId: number;
  priorityId: number;
  formId: number;
  openingDescription: string;
  openingAt: string;
  technicianId: number;
  recurrence?: {
    recurrenceAt: string;
    rule: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    remaining: number;
    week?: number | null;
  } | null;
}

export interface CreateTicketResponse {
  id: number;
  status: number;
}

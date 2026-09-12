import type { TicketCatalogOption } from './ticket-classification';

export interface TicketCreateCatalogsResponse {
  clients: TicketCatalogOption[];
  technicians: TicketCatalogOption[];
  types: TicketCatalogOption[];
  categories: TicketCatalogOption[];
  levels: TicketCatalogOption[];
  priorities: TicketCatalogOption[];
  forms: TicketCatalogOption[];
  recurrenceRules: TicketCatalogOption[];
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
  /** Legacy wall-clock time: YYYY-MM-DDTHH:mm[:ss]. */
  openingAt: string;
  technicianId: number;
  recurrence?: {
    /** Legacy wall-clock time: YYYY-MM-DDTHH:mm[:ss]. */
    recurrenceAt: string;
    rule: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    remaining: number;
    /** Derived by the API for rule 7. `0` means last occurrence. */
    week?: number | null;
  } | null;
}

export interface CreateTicketResponse {
  id: number;
  status: number;
}

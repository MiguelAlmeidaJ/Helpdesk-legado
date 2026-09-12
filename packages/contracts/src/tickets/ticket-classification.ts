export interface TicketCatalogOption {
  id: number;
  name: string;
}

export interface TicketClassificationCatalogsResponse {
  types: TicketCatalogOption[];
  levels: TicketCatalogOption[];
  priorities: TicketCatalogOption[];
  forms: TicketCatalogOption[];
  categories: TicketCatalogOption[];
}

export interface UpdateTicketClassificationRequest {
  typeId: number;
  categoryId: number;
  subcategoryId: number;
  itemId: number;
  levelId: number;
  priorityId: number;
  formId: number;
  openingDescription: string;
}

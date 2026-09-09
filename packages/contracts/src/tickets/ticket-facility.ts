export type TicketFacilityStatus = 0 | 1 | 2 | 3 | 4;

export interface TicketFacilityCreateRequest {
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
  /** Legacy wall-clock time: YYYY-MM-DDTHH:mm[:ss]. */
  openingAt: string;
  technicianId: number;
}

export interface TicketFacilityCreateResponse {
  id: number;
  status: TicketFacilityStatus;
}

export interface TicketFacilityClassificationRequest {
  typeId: number;
  categoryId: number;
  subcategoryId: number;
  levelId: number;
}

export interface TicketFacilityInteractionRequest {
  description: string;
}

export interface TicketFacilityAssignmentRequest {
  technicianId: number;
}

export interface TicketFacilityHoldRequest {
  /** Legacy wall-clock time: YYYY-MM-DDTHH:mm[:ss]. */
  forecastAt: string;
  description: string;
}

export interface TicketFacilityRejectionRequest {
  technicianId: number;
  reason: string;
}

export interface TicketFacilityFinalizeRequest {
  description: string;
}

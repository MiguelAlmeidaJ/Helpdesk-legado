import type {
  ConcludeTicketRequest,
  CreateTicketRequest,
  CreateTicketResponse,
  CreateTicketInteractionRequest,
  FinalizeTicketRequest,
  PutTicketOnHoldRequest,
  RejectTicketRequest,
  TicketAssignmentOptionsResponse,
  TicketAttachment,
  TicketAttachmentKind,
  TicketAttachmentsResponse,
  TicketCatalogOption,
  TicketClassificationCatalogsResponse,
  TicketCreateCatalogsResponse,
  TicketDetailResponse,
  TicketListResponse,
  TicketRejectionOptionsResponse,
  UpdateTicketAssignmentRequest,
  UpdateTicketClassificationRequest,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export interface TicketListQuery {
  page: number;
  limit?: number;
  status?: string;
  clientId?: string;
  requesterId?: string;
  technicianId?: string;
  search?: string;
  openedFrom?: string;
  openedTo?: string;
  sort?: string;
  direction?: string;
}

function append(
  params: URLSearchParams,
  name: string,
  value: string | number | undefined,
) {
  if (value === undefined || value === '') {
    return;
  }

  params.set(name, String(value));
}

export async function fetchTickets(
  query: TicketListQuery,
  signal?: AbortSignal,
): Promise<TicketListResponse> {
  const params = new URLSearchParams();

  append(params, 'page', query.page);
  append(params, 'limit', query.limit);
  append(params, 'status', query.status);
  append(params, 'clientId', query.clientId);
  append(params, 'requesterId', query.requesterId);
  append(params, 'technicianId', query.technicianId);
  append(params, 'search', query.search);
  append(params, 'openedFrom', query.openedFrom);
  append(params, 'openedTo', query.openedTo);
  append(params, 'sort', query.sort);
  append(params, 'direction', query.direction);

  return apiRequest<TicketListResponse>(`tickets?${params.toString()}`, {
    signal,
  });
}

export async function fetchTicketDetail(
  ticketId: number,
  signal?: AbortSignal,
): Promise<TicketDetailResponse> {
  return apiRequest<TicketDetailResponse>(`tickets/${ticketId}`, {
    signal,
  });
}

export async function createTicketInteraction(
  ticketId: number,
  input: CreateTicketInteractionRequest,
): Promise<void> {
  await apiRequest<null>(`tickets/${ticketId}/interactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export async function fetchTicketAssignmentTechnicians(): Promise<TicketAssignmentOptionsResponse> {
  return apiRequest<TicketAssignmentOptionsResponse>(
    'tickets/assignment/technicians',
  );
}

export async function updateTicketAssignment(
  ticketId: number,
  input: UpdateTicketAssignmentRequest,
): Promise<void> {
  await apiRequest<null>(`tickets/${ticketId}/assignment`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export async function fetchTicketRejectionTechnicians(): Promise<TicketRejectionOptionsResponse> {
  return apiRequest<TicketRejectionOptionsResponse>(
    'tickets/rejection/technicians',
  );
}

export async function rejectTicket(
  ticketId: number,
  input: RejectTicketRequest,
): Promise<void> {
  await apiRequest<null>(`tickets/${ticketId}/rejection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export async function putTicketOnHold(
  ticketId: number,
  input: PutTicketOnHoldRequest,
): Promise<void> {
  await apiRequest<null>(`tickets/${ticketId}/hold`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export async function resumeTicket(ticketId: number): Promise<void> {
  await apiRequest<null>(`tickets/${ticketId}/resume`, {
    method: 'POST',
  });
}

export async function concludeTicket(
  ticketId: number,
  input: ConcludeTicketRequest,
): Promise<void> {
  await apiRequest<null>(`tickets/${ticketId}/workflow/conclude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function finalizeTicket(
  ticketId: number,
  input: FinalizeTicketRequest,
): Promise<void> {
  await apiRequest<null>(`tickets/${ticketId}/workflow/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function ticketAttachmentContentUrl(
  ticketId: number,
  kind: TicketAttachmentKind,
  attachmentId: number,
): string {
  const base = (
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'
  ).replace(/\/$/, '');
  return `${base}/tickets/${ticketId}/attachments/${kind}/${attachmentId}/content`;
}

export async function fetchTicketClassificationCatalogs(): Promise<TicketClassificationCatalogsResponse> {
  return apiRequest<TicketClassificationCatalogsResponse>(
    'tickets/catalogs/classification',
  );
}

export async function fetchTicketSubcategories(
  categoryId: number,
): Promise<TicketCatalogOption[]> {
  return apiRequest<TicketCatalogOption[]>(
    `tickets/catalogs/classification/subcategories?categoryId=${categoryId}`,
  );
}

export async function fetchTicketItems(
  subcategoryId: number,
): Promise<TicketCatalogOption[]> {
  return apiRequest<TicketCatalogOption[]>(
    `tickets/catalogs/classification/items?subcategoryId=${subcategoryId}`,
  );
}

export async function updateTicketClassification(
  ticketId: number,
  input: UpdateTicketClassificationRequest,
): Promise<void> {
  await apiRequest<null>(`tickets/${ticketId}/classification`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function fetchTicketAttachments(
  ticketId: number,
): Promise<TicketAttachmentsResponse> {
  return apiRequest<TicketAttachmentsResponse>(`tickets/${ticketId}/attachments`);
}

export async function uploadTicketAttachment(
  ticketId: number,
  file: File,
): Promise<TicketAttachment> {
  const form = new FormData();
  form.set('file', file);
  return apiRequest<TicketAttachment>(`tickets/${ticketId}/attachments`, {
    method: 'POST',
    body: form,
  });
}

export async function deleteTicketAttachment(
  ticketId: number,
  kind: TicketAttachmentKind,
  attachmentId: number,
): Promise<void> {
  await apiRequest<null>(
    `tickets/${ticketId}/attachments/${kind}/${attachmentId}`,
    { method: 'DELETE' },
  );
}

export function fetchTicketCreateCatalogs(): Promise<TicketCreateCatalogsResponse> {
  return apiRequest<TicketCreateCatalogsResponse>('tickets/create/catalogs');
}

export function fetchTicketRequesters(clientId: number): Promise<TicketCatalogOption[]> {
  return apiRequest<TicketCatalogOption[]>(`tickets/create/requesters?clientId=${clientId}`);
}

export function fetchTicketLocations(clientId: number): Promise<TicketCatalogOption[]> {
  return apiRequest<TicketCatalogOption[]>(`tickets/create/locations?clientId=${clientId}`);
}

export function createTicket(input: CreateTicketRequest): Promise<CreateTicketResponse> {
  return apiRequest<CreateTicketResponse>('tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

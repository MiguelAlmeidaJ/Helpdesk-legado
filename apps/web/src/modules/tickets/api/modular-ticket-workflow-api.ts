import type {
  MarketingTicketAssignmentRequest,
  MarketingTicketCatalogsResponse,
  MarketingTicketFinalizeRequest,
  MarketingTicketHoldRequest,
  MarketingTicketInteractionRequest,
  MarketingTicketRejectionRequest,
  TicketCatalogOption,
  TicketCreateCatalogsResponse,
  TicketProjectAssignmentRequest,
  TicketProjectFinalizeRequest,
  TicketProjectHoldRequest,
  TicketProjectInteractionRequest,
  TicketProjectRejectionRequest,
  TicketProjectTaskAssignmentRequest,
  TicketProjectTaskFinalizeRequest,
  TicketProjectTaskHoldRequest,
  TicketProjectTaskImage,
  TicketProjectTaskImagesResponse,
  TicketProjectTaskInteractionRequest,
  TicketProjectTaskListResponse,
  TicketProjectTaskProgressRequest,
  TicketProjectTaskRejectionRequest,
} from '@helpdesk/contracts';
import { ApiError, apiRequest } from '../../../shared/api/api-client';

function json<T>(path: string, method: 'POST' | 'PATCH', body: T): Promise<void> {
  return apiRequest<null>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(() => undefined);
}

export function addDevOpsTicketInteraction(
  ticketId: number,
  input: TicketProjectTaskInteractionRequest,
): Promise<void> {
  return json(`tickets/projects/tasks/${ticketId}/interactions`, 'POST', input);
}

export function assignDevOpsTicket(
  ticketId: number,
  input: TicketProjectTaskAssignmentRequest,
): Promise<void> {
  return json(`tickets/projects/tasks/${ticketId}/assignment`, 'PATCH', input);
}

export function holdDevOpsTicket(
  ticketId: number,
  input: TicketProjectTaskHoldRequest,
): Promise<void> {
  return json(`tickets/projects/tasks/${ticketId}/hold`, 'POST', input);
}

export async function resumeDevOpsTicket(ticketId: number): Promise<void> {
  await apiRequest<null>(`tickets/projects/tasks/${ticketId}/resume`, { method: 'POST' });
}

export function rejectDevOpsTicket(
  ticketId: number,
  input: TicketProjectTaskRejectionRequest,
): Promise<void> {
  return json(`tickets/projects/tasks/${ticketId}/reject`, 'POST', input);
}

export function finalizeDevOpsTicket(
  ticketId: number,
  input: TicketProjectTaskFinalizeRequest,
): Promise<void> {
  return json(`tickets/projects/tasks/${ticketId}/finalize`, 'POST', input);
}

export function updateDevOpsTicketProgress(
  ticketId: number,
  input: TicketProjectTaskProgressRequest,
): Promise<void> {
  return json(`tickets/projects/tasks/${ticketId}/progress`, 'PATCH', input);
}

export function addDevOpsProjectInteraction(
  projectId: number,
  input: TicketProjectInteractionRequest,
): Promise<void> {
  return json(`tickets/projects/${projectId}/interactions`, 'POST', input);
}

export function assignDevOpsProject(
  projectId: number,
  input: TicketProjectAssignmentRequest,
): Promise<void> {
  return json(`tickets/projects/${projectId}/assignment`, 'PATCH', input);
}

export function holdDevOpsProject(
  projectId: number,
  input: TicketProjectHoldRequest,
): Promise<void> {
  return json(`tickets/projects/${projectId}/hold`, 'POST', input);
}

export async function resumeDevOpsProject(projectId: number): Promise<void> {
  await apiRequest<null>(`tickets/projects/${projectId}/resume`, { method: 'POST' });
}

export function rejectDevOpsProject(
  projectId: number,
  input: TicketProjectRejectionRequest,
): Promise<void> {
  return json(`tickets/projects/${projectId}/reject`, 'POST', input);
}

export function finalizeDevOpsProject(
  projectId: number,
  input: TicketProjectFinalizeRequest,
): Promise<void> {
  return json(`tickets/projects/${projectId}/finalize`, 'POST', input);
}

export function addMarketingTicketInteraction(
  ticketId: number,
  input: MarketingTicketInteractionRequest,
): Promise<void> {
  return json(`tickets/marketing/${ticketId}/interactions`, 'POST', input);
}

export function assignMarketingTicket(
  ticketId: number,
  input: MarketingTicketAssignmentRequest,
): Promise<void> {
  return json(`tickets/marketing/${ticketId}/assignment`, 'PATCH', input);
}

export function holdMarketingTicket(
  ticketId: number,
  input: MarketingTicketHoldRequest,
): Promise<void> {
  return json(`tickets/marketing/${ticketId}/hold`, 'POST', input);
}

export async function resumeMarketingTicket(ticketId: number): Promise<void> {
  await apiRequest<null>(`tickets/marketing/${ticketId}/resume`, { method: 'POST' });
}

export function rejectMarketingTicket(
  ticketId: number,
  input: MarketingTicketRejectionRequest,
): Promise<void> {
  return json(`tickets/marketing/${ticketId}/reject`, 'POST', input);
}

export function finalizeMarketingTicket(
  ticketId: number,
  input: MarketingTicketFinalizeRequest,
): Promise<void> {
  return json(`tickets/marketing/${ticketId}/finalize`, 'POST', input);
}

export function fetchDevOpsTicketImages(ticketId: number): Promise<TicketProjectTaskImagesResponse> {
  return apiRequest<TicketProjectTaskImagesResponse>(
    `tickets/projects/tasks/${ticketId}/images`,
  );
}

export function uploadDevOpsTicketImage(
  ticketId: number,
  file: File,
): Promise<TicketProjectTaskImage> {
  const body = new FormData();
  body.set('file', file);
  return apiRequest<TicketProjectTaskImage>(`tickets/projects/tasks/${ticketId}/images`, {
    method: 'POST',
    body,
  });
}

export function replaceDevOpsTicketImage(
  ticketId: number,
  imageId: number,
  file: File,
): Promise<TicketProjectTaskImage> {
  const body = new FormData();
  body.set('file', file);
  return apiRequest<TicketProjectTaskImage>(
    `tickets/projects/tasks/${ticketId}/images/${imageId}`,
    { method: 'PUT', body },
  );
}

export async function deleteDevOpsTicketImage(
  ticketId: number,
  imageId: number,
): Promise<void> {
  await apiRequest<null>(`tickets/projects/tasks/${ticketId}/images/${imageId}`, {
    method: 'DELETE',
  });
}

export function devOpsTicketImageContentUrl(ticketId: number, imageId: number): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4004/api').replace(/\/$/, '');
  return `${base}/tickets/projects/tasks/${ticketId}/images/${imageId}/content`;
}

export async function fetchDevOpsWorkflowTechnicians(): Promise<TicketCatalogOption[]> {
  try {
    const catalogs = await apiRequest<TicketCreateCatalogsResponse>(
      'tickets/devops/create/catalogs',
    );
    return catalogs.technicians.filter((option) => option.id > 0);
  } catch (reason) {
    if (!(reason instanceof ApiError) || reason.status !== 403) throw reason;

    const response = await apiRequest<TicketProjectTaskListResponse>(
      'tickets/projects/tasks?page=1&limit=1&status=all&sort=id&direction=desc',
    );
    return response.options.technicians.filter((option) => option.id > 0);
  }
}

export async function fetchMarketingWorkflowTechnicians(): Promise<TicketCatalogOption[]> {
  const catalogs = await apiRequest<MarketingTicketCatalogsResponse>(
    'tickets/marketing/create/catalogs',
  );
  return catalogs.technicians.filter((option) => option.id > 0);
}

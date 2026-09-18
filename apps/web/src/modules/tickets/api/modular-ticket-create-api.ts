import type {
  DevOpsTicketCreateRequest,
  DevOpsTicketCreateResponse,
  MarketingTicketCatalogsResponse,
  MarketingTicketCreateRequest,
  MarketingTicketCreateResponse,
  TicketCatalogOption,
  TicketCreateCatalogsResponse,
  TicketProjectCreateRequest,
  TicketProjectCreateResponse,
  TicketProjectListResponse,
  TicketProjectTaskCreateRequest,
  TicketProjectTaskCreateResponse,
  TicketProjectTaskListResponse,
  TicketTypesResponse,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchTicketTypes(): Promise<TicketTypesResponse> {
  return apiRequest<TicketTypesResponse>('tickets/types');
}

export function fetchDevOpsCreateCatalogs(): Promise<TicketCreateCatalogsResponse> {
  return apiRequest<TicketCreateCatalogsResponse>('tickets/devops/create/catalogs');
}

export function fetchDevOpsRequesters(
  clientId: number,
): Promise<TicketCatalogOption[]> {
  return apiRequest<TicketCatalogOption[]>(
    `tickets/devops/create/requesters?clientId=${clientId}`,
  );
}

export function fetchDevOpsLocations(
  clientId: number,
): Promise<TicketCatalogOption[]> {
  return apiRequest<TicketCatalogOption[]>(
    `tickets/devops/create/locations?clientId=${clientId}`,
  );
}

export function fetchDevOpsSubcategories(
  categoryId: number,
): Promise<TicketCatalogOption[]> {
  return apiRequest<TicketCatalogOption[]>(
    `tickets/devops/create/subcategories?categoryId=${categoryId}`,
  );
}

export function fetchDevOpsItems(
  subcategoryId: number,
): Promise<TicketCatalogOption[]> {
  return apiRequest<TicketCatalogOption[]>(
    `tickets/devops/create/items?subcategoryId=${subcategoryId}`,
  );
}

export function fetchDevOpsProjects(): Promise<TicketProjectListResponse> {
  return apiRequest<TicketProjectListResponse>(
    'tickets/projects?page=1&limit=100&status=0,1,2,3&sort=id&direction=desc',
  );
}

export function fetchDevOpsProjectTasks(
  projectId: number,
): Promise<TicketProjectTaskListResponse> {
  return apiRequest<TicketProjectTaskListResponse>(
    `tickets/projects/${projectId}/tasks?page=1&limit=100&status=all&sort=id&direction=desc`,
  );
}

export function createDevOpsProject(
  input: TicketProjectCreateRequest,
): Promise<TicketProjectCreateResponse> {
  return apiRequest<TicketProjectCreateResponse>('tickets/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function createStandaloneDevOpsTicket(
  input: DevOpsTicketCreateRequest,
): Promise<DevOpsTicketCreateResponse> {
  return apiRequest<DevOpsTicketCreateResponse>('tickets/devops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function createDevOpsProjectTask(
  projectId: number,
  input: TicketProjectTaskCreateRequest,
): Promise<TicketProjectTaskCreateResponse> {
  return apiRequest<TicketProjectTaskCreateResponse>(
    `tickets/projects/${projectId}/tasks`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
}

export function fetchMarketingCreateCatalogs(): Promise<MarketingTicketCatalogsResponse> {
  return apiRequest<MarketingTicketCatalogsResponse>(
    'tickets/marketing/create/catalogs',
  );
}

export function fetchMarketingRequesters(
  clientId: number,
): Promise<TicketCatalogOption[]> {
  return apiRequest<TicketCatalogOption[]>(
    `tickets/marketing/create/requesters?clientId=${clientId}`,
  );
}

export function fetchMarketingLocations(
  clientId: number,
): Promise<TicketCatalogOption[]> {
  return apiRequest<TicketCatalogOption[]>(
    `tickets/marketing/create/locations?clientId=${clientId}`,
  );
}

export function createMarketingTicket(
  input: MarketingTicketCreateRequest,
): Promise<MarketingTicketCreateResponse> {
  return apiRequest<MarketingTicketCreateResponse>('tickets/marketing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

import type {
  NavigationAdminItemInput,
  NavigationAdminMutationResponse,
  NavigationAdminResponse,
  NavigationAdminSectionInput,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export function fetchNavigationAdmin(signal?: AbortSignal) {
  return apiRequest<NavigationAdminResponse>('navigation/admin', { signal });
}

export function createNavigationSection(input: NavigationAdminSectionInput) {
  return apiRequest<NavigationAdminMutationResponse>('navigation/admin/sections', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

export function updateNavigationSection(
  id: number,
  input: NavigationAdminSectionInput,
) {
  return apiRequest<NavigationAdminMutationResponse>(
    `navigation/admin/sections/${id}`,
    {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    },
  );
}

export function createNavigationItem(input: NavigationAdminItemInput) {
  return apiRequest<NavigationAdminMutationResponse>('navigation/admin/items', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

export function updateNavigationItem(
  id: number,
  input: NavigationAdminItemInput,
) {
  return apiRequest<NavigationAdminMutationResponse>(
    `navigation/admin/items/${id}`,
    {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    },
  );
}

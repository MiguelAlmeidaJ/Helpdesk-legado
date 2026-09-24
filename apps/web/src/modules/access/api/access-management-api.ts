import type {
  AccessManagementSnapshot,
  AccessRoleInput,
  AccessRoleMutationResponse,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchAccessManagement(signal?: AbortSignal) {
  return apiRequest<AccessManagementSnapshot>('access-management', { signal });
}

export function createAccessRole(input: AccessRoleInput) {
  return apiRequest<AccessRoleMutationResponse>('access-management/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateAccessRole(id: number, input: AccessRoleInput) {
  return apiRequest<AccessRoleMutationResponse>(`access-management/roles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function deleteAccessRole(id: number): Promise<void> {
  await apiRequest<null>(`access-management/roles/${id}`, { method: 'DELETE' });
}

import type {
  AccessManagementSnapshot,
  AccessRoleInput,
  AccessRoleMutationResponse,
  AccessUserPermissionSnapshot,
  AccessUserPermissionTarget,
  AccessUserPermissionUpdateInput,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchAccessManagement(signal?: AbortSignal) {
  return apiRequest<AccessManagementSnapshot>('access-management', { signal });
}

export function createAccessRole(input: AccessRoleInput) {
  return apiRequest<AccessRoleMutationResponse>('access-management/roles', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
}

export function updateAccessRole(id: number, input: AccessRoleInput) {
  return apiRequest<AccessRoleMutationResponse>(`access-management/roles/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
}

export async function reorderAccessRoles(roleIds: number[]): Promise<void> {
  await apiRequest<null>('access-management/roles/order', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleIds }),
  });
}

export async function deleteAccessRole(id: number): Promise<void> {
  await apiRequest<null>(`access-management/roles/${id}`, { method: 'DELETE' });
}


export function fetchAccessUserTargets(signal?: AbortSignal) {
  return apiRequest<AccessUserPermissionTarget[]>('access-management/users', {
    signal,
  });
}

export function fetchAccessUserPermissions(
  userId: number,
  signal?: AbortSignal,
) {
  return apiRequest<AccessUserPermissionSnapshot>(
    `access-management/users/${userId}`,
    { signal },
  );
}

export async function updateAccessUserPermissions(
  userId: number,
  input: AccessUserPermissionUpdateInput,
): Promise<void> {
  await apiRequest<null>(`access-management/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

import type {
  CreateManagedUserRequest,
  ManagedUserDetail,
  ManagedUserListFilters,
  ManagedUserListResponse,
  UpdateManagedUserRequest,
  UserManagementCatalogs,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchUsers(
  page: number,
  filters: ManagedUserListFilters,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({ page: String(page), limit: '50' });
  if (filters.search) query.set('search', filters.search);
  if (filters.status) query.set('status', String(filters.status));
  if (filters.roleId) query.set('roleId', String(filters.roleId));
  return apiRequest<ManagedUserListResponse>(`users?${query}`, { signal });
}

export function fetchUser(id: number) {
  return apiRequest<ManagedUserDetail>(`users/${id}`);
}

export function fetchUserCatalogs() {
  return apiRequest<UserManagementCatalogs>('users/catalogs');
}

export function createUser(input: CreateManagedUserRequest) {
  return apiRequest<ManagedUserDetail>('users', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
}

export function updateUser(id: number, input: UpdateManagedUserRequest) {
  return apiRequest<ManagedUserDetail>(`users/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
}

export async function deactivateUser(id: number): Promise<void> {
  await apiRequest<null>(`users/${id}`, { method: 'DELETE' });
}

import type {
  CreateManagedUserRequest,
  ManagedUserDetail,
  ManagedUserListResponse,
  UpdateManagedUserRequest,
  UserManagementCatalogs,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchUsers(page: number, search: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ page: String(page), limit: '50' });
  if (search) query.set('search', search);
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

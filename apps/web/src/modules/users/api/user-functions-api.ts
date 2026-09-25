import type {
  UserFunctionInput,
  UserFunctionMutationResponse,
  UserFunctionSummary,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchUserFunctions(signal?: AbortSignal) {
  return apiRequest<UserFunctionSummary[]>('user-functions', { signal });
}

export function createUserFunction(input: UserFunctionInput) {
  return apiRequest<UserFunctionMutationResponse>('user-functions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateUserFunction(id: number, input: UserFunctionInput) {
  return apiRequest<UserFunctionMutationResponse>(`user-functions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function deleteUserFunction(id: number): Promise<void> {
  await apiRequest<null>(`user-functions/${id}`, { method: 'DELETE' });
}

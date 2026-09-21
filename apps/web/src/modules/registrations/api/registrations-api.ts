import type {
  RegistrationListResponse,
  RegistrationRecord,
  RegistrationResourceKey,
  RegistrationWriteInput,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchRegistration(
  resource: RegistrationResourceKey,
  search = '',
  signal?: AbortSignal,
): Promise<RegistrationListResponse> {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  const query = params.toString();
  return apiRequest<RegistrationListResponse>(
    `registrations/${resource}${query ? `?${query}` : ''}`,
    { signal },
  );
}

export function createRegistration(
  resource: RegistrationResourceKey,
  input: RegistrationWriteInput,
): Promise<RegistrationRecord> {
  return apiRequest<RegistrationRecord>(`registrations/${resource}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateRegistration(
  resource: RegistrationResourceKey,
  id: number,
  input: RegistrationWriteInput,
): Promise<RegistrationRecord> {
  return apiRequest<RegistrationRecord>(`registrations/${resource}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

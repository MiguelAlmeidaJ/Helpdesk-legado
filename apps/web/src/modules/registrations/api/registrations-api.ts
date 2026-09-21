import type {
  CategoryChildWriteInput,
  CategoryItemRecord,
  CategorySubcategoryRecord,
  CategoryTreeResponse,
  ClientContactRecord,
  ClientContactWriteInput,
  ClientLocationRecord,
  ClientLocationWriteInput,
  ClientRelationsResponse,
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

export function fetchClientRelations(
  clientId: number,
  signal?: AbortSignal,
): Promise<ClientRelationsResponse> {
  return apiRequest<ClientRelationsResponse>(
    `registrations/clients/${clientId}/relations`,
    { signal },
  );
}

export function createClientContact(
  clientId: number,
  input: ClientContactWriteInput,
): Promise<ClientContactRecord> {
  return apiRequest<ClientContactRecord>(
    `registrations/clients/${clientId}/contacts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
}

export function updateClientContact(
  clientId: number,
  contactId: number,
  input: ClientContactWriteInput,
): Promise<ClientContactRecord> {
  return apiRequest<ClientContactRecord>(
    `registrations/clients/${clientId}/contacts/${contactId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
}

export function createClientLocation(
  clientId: number,
  input: ClientLocationWriteInput,
): Promise<ClientLocationRecord> {
  return apiRequest<ClientLocationRecord>(
    `registrations/clients/${clientId}/locations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
}

export function updateClientLocation(
  clientId: number,
  locationId: number,
  input: ClientLocationWriteInput,
): Promise<ClientLocationRecord> {
  return apiRequest<ClientLocationRecord>(
    `registrations/clients/${clientId}/locations/${locationId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
}

export function fetchCategoryTree(
  categoryId: number,
  signal?: AbortSignal,
): Promise<CategoryTreeResponse> {
  return apiRequest<CategoryTreeResponse>(
    `registrations/categories/${categoryId}/tree`,
    { signal },
  );
}

export function createSubcategory(
  categoryId: number,
  input: CategoryChildWriteInput,
): Promise<CategorySubcategoryRecord> {
  return apiRequest<CategorySubcategoryRecord>(
    `registrations/categories/${categoryId}/subcategories`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
}

export function updateSubcategory(
  categoryId: number,
  subcategoryId: number,
  input: CategoryChildWriteInput,
): Promise<CategorySubcategoryRecord> {
  return apiRequest<CategorySubcategoryRecord>(
    `registrations/categories/${categoryId}/subcategories/${subcategoryId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
}

export function createCategoryItem(
  categoryId: number,
  subcategoryId: number,
  input: CategoryChildWriteInput,
): Promise<CategoryItemRecord> {
  return apiRequest<CategoryItemRecord>(
    `registrations/categories/${categoryId}/subcategories/${subcategoryId}/items`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
}

export function updateCategoryItem(
  categoryId: number,
  subcategoryId: number,
  itemId: number,
  input: CategoryChildWriteInput,
): Promise<CategoryItemRecord> {
  return apiRequest<CategoryItemRecord>(
    `registrations/categories/${categoryId}/subcategories/${subcategoryId}/items/${itemId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
}

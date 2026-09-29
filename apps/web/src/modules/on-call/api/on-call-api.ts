import type {
  CreateOnCallHolidayRequest,
  OnCallSettings,
  OnCallSnapshot,
  SaveOnCallWeekRequest,
  UpdateOnCallSettingsRequest,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchOnCallSnapshot(
  week?: string,
  signal?: AbortSignal,
): Promise<OnCallSnapshot> {
  const suffix = week ? `?week=${encodeURIComponent(week)}` : '';
  return apiRequest<OnCallSnapshot>(`administration/on-call${suffix}`, {
    signal,
  });
}

export async function saveOnCallWeek(
  input: SaveOnCallWeekRequest,
): Promise<void> {
  await apiRequest<void>('administration/on-call/week', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateOnCallSettings(
  input: UpdateOnCallSettingsRequest,
): Promise<OnCallSettings> {
  return apiRequest<OnCallSettings>('administration/on-call/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function createOnCallHoliday(
  input: CreateOnCallHolidayRequest,
): Promise<void> {
  await apiRequest<void>('administration/on-call/holidays', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function deleteOnCallHoliday(id: number): Promise<void> {
  await apiRequest<void>(`administration/on-call/holidays/${id}`, {
    method: 'DELETE',
  });
}

import type {
  CommemorativeDate,
  CommemorativeDatesResponse,
  SaveCommemorativeDateRequest,
  HolidayLocationsResponse,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchCommemorativeDates(
  signal?: AbortSignal,
  year?: number,
): Promise<CommemorativeDatesResponse> {
  return apiRequest<CommemorativeDatesResponse>(
    `quality/commemorative-dates${year ? `?year=${year}` : ''}`,
    { signal },
  );
}

export function createCommemorativeDate(
  input: SaveCommemorativeDateRequest,
): Promise<CommemorativeDate> {
  return apiRequest<CommemorativeDate>('quality/commemorative-dates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function fetchHolidayLocations(state?: string, signal?: AbortSignal): Promise<HolidayLocationsResponse> {
  return apiRequest<HolidayLocationsResponse>(`quality/commemorative-dates/locations${state ? `?state=${encodeURIComponent(state)}` : ''}`, { signal });
}

export async function deleteCommemorativeDate(id: number, regional = false): Promise<void> {
  await apiRequest<void>(`quality/commemorative-dates/${regional ? 'regional/' : ''}${id}`, {
    method: 'DELETE',
  });
}

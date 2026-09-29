import type {
  CommemorativeDate,
  CommemorativeDatesResponse,
  SaveCommemorativeDateRequest,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchCommemorativeDates(
  signal?: AbortSignal,
): Promise<CommemorativeDatesResponse> {
  return apiRequest<CommemorativeDatesResponse>(
    'quality/commemorative-dates',
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

export async function deleteCommemorativeDate(id: number): Promise<void> {
  await apiRequest<void>(`quality/commemorative-dates/${id}`, {
    method: 'DELETE',
  });
}

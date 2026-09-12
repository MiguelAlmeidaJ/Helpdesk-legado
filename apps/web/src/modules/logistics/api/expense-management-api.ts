import type {
  CreateLogisticsExpenseRequest,
  LogisticsExpenseAttachment,
  LogisticsExpenseManagementResponse,
  UpdateLogisticsExpenseRequest,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

const base = 'logistics/expenses';

export function getExpenseManagement(
  startDate?: string,
  endDate?: string,
): Promise<LogisticsExpenseManagementResponse> {
  const query = new URLSearchParams();
  if (startDate) query.set('startDate', startDate);
  if (endDate) query.set('endDate', endDate);

  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiRequest<LogisticsExpenseManagementResponse>(`${base}${suffix}`);
}

export function createExpense(
  request: CreateLogisticsExpenseRequest,
): Promise<{ id: number }> {
  return apiRequest<{ id: number }>(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export function updateExpense(
  id: number,
  request: UpdateLogisticsExpenseRequest,
): Promise<void> {
  return apiRequest<void>(`${base}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export function deleteExpense(id: number): Promise<void> {
  return apiRequest<void>(`${base}/${id}`, {
    method: 'DELETE',
  });
}

export function uploadExpenseAttachment(
  id: number,
  file: File,
): Promise<LogisticsExpenseAttachment> {
  const body = new FormData();
  body.append('file', file);

  return apiRequest<LogisticsExpenseAttachment>(
    `${base}/${id}/attachments`,
    {
      method: 'POST',
      body,
    },
  );
}

export function deleteExpenseAttachment(
  id: number,
  key: string,
): Promise<void> {
  return apiRequest<void>(
    `${base}/${id}/attachments/${encodeURIComponent(key)}`,
    { method: 'DELETE' },
  );
}

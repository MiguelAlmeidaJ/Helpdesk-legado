import type {
  FinanceCatalogsResponse,
  FinanceListResponse,
  FinancePaymentInput,
  FinancePayableWriteInput,
  FinanceReceiptInput,
  FinanceReceivableWriteInput,
  FinanceRecurringWriteInput,
  FinanceViewKey,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

export function fetchFinanceView(
  view: FinanceViewKey,
  filters: { startDate: string; endDate: string; search?: string },
  signal?: AbortSignal,
): Promise<FinanceListResponse> {
  const query = new URLSearchParams({
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  if (filters.search?.trim()) query.set('search', filters.search.trim());
  return apiRequest<FinanceListResponse>(
    `logistics/finance/${view}?${query.toString()}`,
    { signal },
  );
}

export function fetchFinanceCatalogs(
  signal?: AbortSignal,
): Promise<FinanceCatalogsResponse> {
  return apiRequest<FinanceCatalogsResponse>('logistics/finance/catalogs', {
    signal,
  });
}

export function createReceivable(input: FinanceReceivableWriteInput) {
  return apiRequest<{ id: number }>('logistics/finance/receivables', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function updateReceivable(
  id: number,
  input: FinanceReceivableWriteInput,
): Promise<void> {
  await apiRequest(`logistics/finance/receivables/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function receiveFinanceAccount(
  id: number,
  input: FinanceReceiptInput,
): Promise<void> {
  await apiRequest(`logistics/finance/receivables/${id}/receipts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function createPayable(input: FinancePayableWriteInput) {
  return apiRequest<{ id: number }>('logistics/finance/payables', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function updatePayable(
  id: number,
  input: FinancePayableWriteInput,
): Promise<void> {
  await apiRequest(`logistics/finance/payables/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function payFinanceAccount(
  id: number,
  input: FinancePaymentInput,
): Promise<void> {
  await apiRequest(`logistics/finance/payables/${id}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function createRecurringFinance(input: FinanceRecurringWriteInput) {
  return apiRequest<{ id: number }>('logistics/finance/recurring', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function updateRecurringFinance(
  id: number,
  input: FinanceRecurringWriteInput,
): Promise<void> {
  await apiRequest(`logistics/finance/recurring/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

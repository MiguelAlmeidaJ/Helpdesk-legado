import type {
  LogisticsExpenseBatchPaymentRequest,
  LogisticsExpensePaymentActionResponse,
  LogisticsExpensePaymentQueueResponse,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

function jsonRequest<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

export function getExpensePaymentQueue(): Promise<LogisticsExpensePaymentQueueResponse> {
  return apiRequest<LogisticsExpensePaymentQueueResponse>(
    'logistics/expenses/admin/payments',
  );
}

export function payExpense(
  expenseId: number,
  remarks: string,
): Promise<LogisticsExpensePaymentActionResponse> {
  return jsonRequest(`logistics/expenses/admin/payments/${expenseId}/pay`, {
    remarks,
  });
}

export function rejectExpensePayment(
  expenseId: number,
  remarks: string,
): Promise<LogisticsExpensePaymentActionResponse> {
  return jsonRequest(`logistics/expenses/admin/payments/${expenseId}/reject`, {
    remarks,
  });
}

export function payExpensesBatch(
  items: LogisticsExpenseBatchPaymentRequest['items'],
): Promise<LogisticsExpensePaymentActionResponse> {
  return jsonRequest('logistics/expenses/admin/payments/batch/pay', { items });
}

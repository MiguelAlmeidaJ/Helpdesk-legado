import type {
  LogisticsExpenseApprovalActionResponse,
  LogisticsExpenseApprovalQueueResponse,
  LogisticsExpenseBatchApprovalEntry,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

function jsonRequest<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

export function getExpenseApprovalQueue(): Promise<LogisticsExpenseApprovalQueueResponse> {
  return apiRequest<LogisticsExpenseApprovalQueueResponse>(
    'logistics/expenses/admin/approvals',
  );
}

export function approveExpense(
  expenseId: number,
  remarks: string,
): Promise<LogisticsExpenseApprovalActionResponse> {
  return jsonRequest(`logistics/expenses/admin/approvals/${expenseId}/approve`, {
    remarks,
  });
}

export function rejectExpense(
  expenseId: number,
): Promise<LogisticsExpenseApprovalActionResponse> {
  return jsonRequest(`logistics/expenses/admin/approvals/${expenseId}/reject`);
}

export function approveExpensesBatch(
  items: LogisticsExpenseBatchApprovalEntry[],
): Promise<LogisticsExpenseApprovalActionResponse> {
  return jsonRequest('logistics/expenses/admin/approvals/batch/approve', { items });
}

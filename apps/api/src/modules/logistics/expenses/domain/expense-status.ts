export const ExpenseStatus = {
  Pending: 1,
  Approved: 2,
  Rejected: 3,
  Paid: 4,
} as const;

export type ExpenseStatusValue =
  (typeof ExpenseStatus)[keyof typeof ExpenseStatus];

export type ExpenseTransition = 'approve' | 'reject' | 'pay';

type RawExpenseStatus = number | bigint | string | null | undefined;

export function parseExpenseStatus(
  value: RawExpenseStatus,
): ExpenseStatusValue | null {
  const parsed = Number(value);

  switch (parsed) {
    case ExpenseStatus.Pending:
      return ExpenseStatus.Pending;
    case ExpenseStatus.Approved:
      return ExpenseStatus.Approved;
    case ExpenseStatus.Rejected:
      return ExpenseStatus.Rejected;
    case ExpenseStatus.Paid:
      return ExpenseStatus.Paid;
    default:
      return null;
  }
}

export function expenseStatus(value: RawExpenseStatus): ExpenseStatusValue {
  return parseExpenseStatus(value) ?? ExpenseStatus.Pending;
}

export function canEditExpense(value: RawExpenseStatus): boolean {
  return parseExpenseStatus(value) === ExpenseStatus.Pending;
}

export function canTransitionExpense(
  value: RawExpenseStatus,
  transition: ExpenseTransition,
): boolean {
  const current = parseExpenseStatus(value);
  if (current === null) return false;

  switch (transition) {
    case 'approve':
    case 'reject':
      return current === ExpenseStatus.Pending;
    case 'pay':
      return current === ExpenseStatus.Approved;
  }
}

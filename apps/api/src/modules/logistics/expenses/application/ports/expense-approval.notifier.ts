import type { LogisticsExpenseApprovalItem } from '@helpdesk/contracts';

export abstract class ExpenseApprovalNotifier {
  abstract sendApproved(items: LogisticsExpenseApprovalItem[]): Promise<void>;
}

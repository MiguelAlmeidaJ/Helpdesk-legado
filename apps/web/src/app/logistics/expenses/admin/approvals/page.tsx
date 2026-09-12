import { AppPermission, type CurrentUserResponse } from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../../../modules/access/server/current-user';
import { ExpenseApprovalScreen } from '../../../../../modules/logistics/components/expense-approval-screen';

export const metadata: Metadata = {
  title: 'Aprovação de RDs · Helpdesk',
  description: 'Aprovação e recusa administrativa de despesas',
};

function canApprove(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.LogisticsExpensesApprove,
  );
}

export default async function ExpenseApprovalsPage() {
  const currentUser = await requireAuthenticatedUser(
    '/logistics/expenses/admin/approvals',
  );

  if (!canApprove(currentUser)) {
    redirect('/logistics/expenses/admin');
  }

  return <ExpenseApprovalScreen currentUser={currentUser} />;
}

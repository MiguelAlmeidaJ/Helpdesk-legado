import { AppPermission, type CurrentUserResponse } from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { ExpenseAdminDashboardScreen } from '../../../../modules/logistics/components/expense-admin-dashboard-screen';

export const metadata: Metadata = {
  title: 'Gestão de RDs · Helpdesk',
  description: 'Painel administrativo de despesas e reembolsos',
};

function canReadAdminDashboard(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.LogisticsExpensesAdminRead,
  );
}

export default async function ExpenseAdminPage() {
  const currentUser = await requireAuthenticatedUser(
    '/logistics/expenses/admin',
  );

  if (!canReadAdminDashboard(currentUser)) {
    redirect('/logistics/expenses');
  }

  return <ExpenseAdminDashboardScreen currentUser={currentUser} />;
}

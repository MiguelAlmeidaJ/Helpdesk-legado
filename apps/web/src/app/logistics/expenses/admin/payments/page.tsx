import { AppPermission, type CurrentUserResponse } from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../../../modules/access/server/current-user';
import { ExpensePaymentScreen } from '../../../../../modules/logistics/components/expense-payment-screen';

export const metadata: Metadata = {
  title: 'Pagamento de RDs · Helpdesk',
  description: 'Pagamento administrativo de despesas aprovadas',
};

function canPay(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.LogisticsExpensesPay,
  );
}

export default async function ExpensePaymentsPage() {
  const currentUser = await requireAuthenticatedUser(
    '/logistics/expenses/admin/payments',
  );

  if (!canPay(currentUser)) {
    redirect('/logistics/expenses/admin');
  }

  return <ExpensePaymentScreen currentUser={currentUser} />;
}

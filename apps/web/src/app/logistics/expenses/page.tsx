import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { ExpenseDashboardScreen } from '../../../modules/logistics/components/expense-dashboard-screen';

export const metadata: Metadata = {
  title: 'RD · Helpdesk',
  description: 'Painel pessoal de despesas e reembolsos',
};

export default async function ExpensesPage() {
  const currentUser = await requireAuthenticatedUser('/logistics/expenses');

  return <ExpenseDashboardScreen currentUser={currentUser} />;
}

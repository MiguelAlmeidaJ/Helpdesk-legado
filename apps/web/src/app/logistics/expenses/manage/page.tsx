import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { ExpenseManagementScreen } from '../../../../modules/logistics/components/expense-management-screen';

export const metadata: Metadata = {
  title: 'Gerenciar RD · Helpdesk',
  description: 'Cadastro e manutenção das despesas pessoais',
};

export default async function ExpenseManagementPage() {
  const currentUser = await requireAuthenticatedUser(
    '/logistics/expenses/manage',
  );

  return <ExpenseManagementScreen currentUser={currentUser} />;
}

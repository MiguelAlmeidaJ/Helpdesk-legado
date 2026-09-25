import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { AccountManagementScreen } from '../../../../modules/logistics/components/account-management-screen';

export const metadata: Metadata = { title: 'Gestão de Contas · Helpdesk' };

export default async function Page() {
  const currentUser = await requireAuthenticatedUser('/logistica/financeiro/gestao-de-contas');
  return <AccountManagementScreen currentUser={currentUser} />;
}

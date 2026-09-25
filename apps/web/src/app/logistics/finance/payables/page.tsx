import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { FinanceScreen } from '../../../../modules/logistics/components/finance-screen';

export const metadata: Metadata = { title: 'Contas a Pagar · Helpdesk' };

export default async function Page() {
  const currentUser = await requireAuthenticatedUser('/logistica/financeiro/contas-a-pagar');
  return <FinanceScreen currentUser={currentUser} view="payables" />;
}

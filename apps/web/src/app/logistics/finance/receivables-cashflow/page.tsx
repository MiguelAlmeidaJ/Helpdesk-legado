import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../../modules/access/server/current-user';
import { FinanceScreen } from '../../../../../modules/logistics/components/finance-screen';

export const metadata: Metadata = { title: 'Contas a Receber · Fluxo · Helpdesk' };

export default async function Page() {
  const currentUser = await requireAuthenticatedUser('/logistica/financeiro/contas-a-receber-fluxo');
  return <FinanceScreen currentUser={currentUser} view="receivables-cashflow" />;
}

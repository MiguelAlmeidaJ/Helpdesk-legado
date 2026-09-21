import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../../modules/access/server/current-user';
import { FinanceScreen } from '../../../../../modules/logistics/components/finance-screen';

export const metadata: Metadata = { title: 'Contabilidade · Helpdesk' };

export default async function Page() {
  const currentUser = await requireAuthenticatedUser('/logistica/financeiro/contabilidade');
  return <FinanceScreen currentUser={currentUser} view="accounting" />;
}

import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { FinanceScreen } from '../../../../modules/logistics/components/finance-screen';

export const metadata: Metadata = { title: 'Extratos · Helpdesk' };

export default async function Page() {
  const currentUser = await requireAuthenticatedUser('/extratos');
  return <FinanceScreen currentUser={currentUser} view="statements" />;
}

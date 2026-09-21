import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { MarketingTicketsScreen } from '../../../modules/tickets/components/marketing-tickets-screen';

export const metadata: Metadata = {
  title: 'Marketing · Atendimentos · Helpdesk',
  description: 'Lista nativa de atendimentos de Marketing',
};

export default async function MarketingTicketsPage() {
  const currentUser = await requireAuthenticatedUser('/atendimentos/marketing');
  return <MarketingTicketsScreen currentUser={currentUser} />;
}

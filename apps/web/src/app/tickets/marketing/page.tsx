import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { MarketingTicketsScreen } from '../../../modules/tickets/components/marketing-tickets-screen';

export const metadata: Metadata = {
  title: 'Marketing · Tickets · Helpdesk',
  description: 'Lista nativa de tickets de Marketing',
};

export default async function MarketingTicketsPage() {
  const currentUser = await requireAuthenticatedUser('/tickets/marketing');
  return <MarketingTicketsScreen currentUser={currentUser} />;
}

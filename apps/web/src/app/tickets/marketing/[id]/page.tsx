import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { MarketingTicketDetailScreen } from '../../../../modules/tickets/components/marketing-ticket-detail-screen';

export const metadata: Metadata = { title: 'Ticket de Marketing · Helpdesk' };

export default async function MarketingTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const ticketId = Number(id);
  if (!Number.isSafeInteger(ticketId) || ticketId < 1) notFound();
  const currentUser = await requireAuthenticatedUser(`/tickets/marketing/${ticketId}`);
  return <MarketingTicketDetailScreen currentUser={currentUser} ticketId={ticketId} />;
}

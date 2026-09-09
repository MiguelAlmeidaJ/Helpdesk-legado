import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { DevOpsTicketDetailScreen } from '../../../../modules/tickets/components/devops-ticket-detail-screen';

export const metadata: Metadata = { title: 'Ticket DevOps · Helpdesk' };

export default async function DevOpsTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const ticketId = Number(id);
  if (!Number.isSafeInteger(ticketId) || ticketId < 1) notFound();
  const currentUser = await requireAuthenticatedUser(`/tickets/devops/${ticketId}`);
  return <DevOpsTicketDetailScreen currentUser={currentUser} ticketId={ticketId} />;
}

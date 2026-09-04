import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { TicketDetailScreen } from '../../../modules/tickets/components/ticket-detail-screen';

export const metadata: Metadata = {
  title: 'Detalhe do atendimento · Helpdesk',
  description: 'Detalhe e histórico do atendimento',
};

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const ticketId = Number(id);

  if (!Number.isSafeInteger(ticketId) || ticketId < 1) {
    notFound();
  }

  const currentUser = await requireAuthenticatedUser(`/tickets/${ticketId}`);

  return (
    <TicketDetailScreen
      currentUser={currentUser}
      ticketId={ticketId}
    />
  );
}

import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { TicketTimelineScreen } from '../../../modules/tickets/components/ticket-timeline-screen';

export const metadata: Metadata = {
  title: 'Timeline · Helpdesk',
  description: 'Interações de atendimentos das últimas 24 horas',
};

export default async function TicketTimelinePage() {
  const currentUser = await requireAuthenticatedUser('/tickets/timeline');

  return <TicketTimelineScreen currentUser={currentUser} />;
}

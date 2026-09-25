import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { TicketTimelineScreen } from '../../../modules/tickets/components/ticket-timeline-screen';

export const metadata: Metadata = {
  title: 'Timeline do Técnico · Helpdesk',
  description: 'Interações diárias de atendimentos por técnico',
};

export default async function TicketTimelinePage() {
  const currentUser = await requireAuthenticatedUser('/atendimentos/linha-do-tempo');

  return <TicketTimelineScreen currentUser={currentUser} />;
}

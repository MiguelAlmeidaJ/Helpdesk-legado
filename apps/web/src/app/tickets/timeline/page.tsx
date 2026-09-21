import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { TicketTimelineScreen } from '../../../modules/tickets/components/ticket-timeline-screen';

export const metadata: Metadata = {
  title: 'Linha do tempo · Helpdesk',
  description: 'Interações de atendimentos das últimas 24 horas',
};

export default async function TicketTimelinePage() {
  const currentUser = await requireAuthenticatedUser('/atendimentos/linha-do-tempo');

  return <TicketTimelineScreen currentUser={currentUser} />;
}

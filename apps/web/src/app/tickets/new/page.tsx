import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { TicketCreateScreen } from '../../../modules/tickets/components/ticket-create-screen';

export const metadata: Metadata = { title: 'Novo atendimento · Helpdesk' };

export default async function NewTicketPage() {
  const currentUser = await requireAuthenticatedUser('/tickets/new');
  return <TicketCreateScreen currentUser={currentUser} />;
}

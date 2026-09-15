import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { TicketRecurrencesScreen } from '../../../modules/tickets/components/ticket-recurrences-screen';

export const metadata: Metadata = {
  title: 'Recorrências · Helpdesk',
  description: 'Gestão de atendimentos recorrentes',
};

export default async function TicketRecurrencesPage() {
  const currentUser = await requireAuthenticatedUser('/tickets/recurrences');
  return <TicketRecurrencesScreen currentUser={currentUser} />;
}

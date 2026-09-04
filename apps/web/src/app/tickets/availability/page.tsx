import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { TicketAvailabilityScreen } from '../../../modules/tickets/components/ticket-availability-screen';

export const metadata: Metadata = {
  title: 'Disponibilidade Técnica · Helpdesk',
  description: 'Painel operacional de disponibilidade técnica',
};

export default async function TicketAvailabilityPage() {
  const currentUser = await requireAuthenticatedUser('/tickets/availability');

  return <TicketAvailabilityScreen currentUser={currentUser} />;
}

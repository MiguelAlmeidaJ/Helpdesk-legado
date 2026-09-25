import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { LegacyTicketAvailabilityScreen } from '../../../../modules/tickets/components/legacy-ticket-availability-screen';

export const metadata: Metadata = {
  title: 'Disponibilidade Técnica Antiga · Helpdesk',
  description: 'Visual clássico da disponibilidade técnica',
};

export default async function LegacyAvailabilityPage() {
  const currentUser = await requireAuthenticatedUser(
    '/atendimentos/disponibilidade/antiga',
  );

  return <LegacyTicketAvailabilityScreen currentUser={currentUser} />;
}

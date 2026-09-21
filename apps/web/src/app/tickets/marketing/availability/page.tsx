import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { MarketingAvailabilityScreen } from '../../../../modules/tickets/components/marketing-availability-screen';

export const metadata: Metadata = {
  title: 'Disponibilidade Técnica · Marketing · Helpdesk',
  description: 'Disponibilidade técnica e filas operacionais do Marketing',
};

export default async function MarketingAvailabilityPage() {
  const currentUser = await requireAuthenticatedUser(
    '/atendimentos/marketing/disponibilidade',
  );

  return <MarketingAvailabilityScreen currentUser={currentUser} />;
}

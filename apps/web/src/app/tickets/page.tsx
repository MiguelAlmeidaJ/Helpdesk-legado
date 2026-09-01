import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../modules/access/server/current-user';
import { TicketsScreen } from '../../modules/tickets/components/tickets-screen';

export const metadata: Metadata = {
  title: 'Atendimentos · Helpdesk',
  description: 'Consulta de atendimentos do Helpdesk',
};

export default async function TicketsPage() {
  await requireAuthenticatedUser('/tickets');

  return <TicketsScreen />;
}

import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { DevOpsTicketsScreen } from '../../../modules/tickets/components/devops-tickets-screen';

export const metadata: Metadata = {
  title: 'DevOps · Atendimentos · Helpdesk',
  description: 'Lista nativa de atendimentos DevOps',
};

export default async function DevOpsTicketsPage() {
  const currentUser = await requireAuthenticatedUser('/atendimentos/devops');
  return <DevOpsTicketsScreen currentUser={currentUser} />;
}

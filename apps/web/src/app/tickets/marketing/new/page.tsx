import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { ModularTicketCreateScreen } from '../../../../modules/tickets/components/modular-ticket-create-screen';

export const metadata: Metadata = { title: 'Nova tarefa de Marketing · Helpdesk' };

export default async function NewMarketingTaskPage() {
  const currentUser = await requireAuthenticatedUser(
    '/atendimentos/marketing/nova-tarefa',
  );

  return (
    <ModularTicketCreateScreen
      currentUser={currentUser}
      initialType="marketing"
    />
  );
}

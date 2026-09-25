import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { TicketCreateScreen } from '../../../modules/tickets/components/ticket-create-screen';

export const metadata: Metadata = { title: 'Novo atendimento · Helpdesk' };

interface NewTicketPageProps {
  searchParams: Promise<{
    type?: string | string[];
    projectId?: string | string[];
  }>;
}

export default async function NewTicketPage({
  searchParams,
}: NewTicketPageProps) {
  const params = await searchParams;
  const requestedType = Array.isArray(params.type) ? params.type[0] : params.type;
  const rawProjectId = Array.isArray(params.projectId)
    ? params.projectId[0]
    : params.projectId;
  const parsedProjectId = Number(rawProjectId);
  const projectQuery =
    Number.isSafeInteger(parsedProjectId) && parsedProjectId > 0
      ? `?projectId=${parsedProjectId}`
      : '';

  if (requestedType === 'devops') {
    redirect(`/atendimentos/devops/nova-tarefa${projectQuery}`);
  }

  if (requestedType === 'marketing') {
    redirect('/atendimentos/marketing/nova-tarefa');
  }

  const currentUser = await requireAuthenticatedUser('/atendimentos/novo');
  return <TicketCreateScreen currentUser={currentUser} />;
}

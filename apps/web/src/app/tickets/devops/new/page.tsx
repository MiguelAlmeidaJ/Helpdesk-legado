import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { ModularTicketCreateScreen } from '../../../../modules/tickets/components/modular-ticket-create-screen';

export const metadata: Metadata = { title: 'Nova tarefa DevOps · Helpdesk' };

export default async function NewDevOpsTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string | string[] }>;
}) {
  const currentUser = await requireAuthenticatedUser('/atendimentos/devops/nova-tarefa');
  const params = await searchParams;
  const rawProjectId = Array.isArray(params.projectId)
    ? params.projectId[0]
    : params.projectId;
  const parsedProjectId = Number(rawProjectId);
  const initialProjectId =
    Number.isSafeInteger(parsedProjectId) && parsedProjectId > 0
      ? parsedProjectId
      : undefined;

  return (
    <ModularTicketCreateScreen
      currentUser={currentUser}
      initialProjectId={initialProjectId}
      initialType="devops"
    />
  );
}

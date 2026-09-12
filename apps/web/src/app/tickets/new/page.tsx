import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { ModularTicketCreateScreen } from '../../../modules/tickets/components/modular-ticket-create-screen';
import { TicketCreateScreen } from '../../../modules/tickets/components/ticket-create-screen';

export const metadata: Metadata = { title: 'Novo ticket · Helpdesk' };

interface NewTicketPageProps {
  searchParams: Promise<{
    type?: string | string[];
    projectId?: string | string[];
  }>;
}

export default async function NewTicketPage({
  searchParams,
}: NewTicketPageProps) {
  const currentUser = await requireAuthenticatedUser('/tickets/new');
  const params = await searchParams;
  const requestedType = Array.isArray(params.type) ? params.type[0] : params.type;
  const rawProjectId = Array.isArray(params.projectId)
    ? params.projectId[0]
    : params.projectId;
  const parsedProjectId = Number(rawProjectId);
  const initialProjectId =
    Number.isSafeInteger(parsedProjectId) && parsedProjectId > 0
      ? parsedProjectId
      : undefined;

  if (requestedType === 'atendimento') {
    return <TicketCreateScreen currentUser={currentUser} />;
  }

  const initialType =
    requestedType === 'devops' || requestedType === 'marketing'
      ? requestedType
      : undefined;

  return (
    <ModularTicketCreateScreen
      currentUser={currentUser}
      initialProjectId={initialType === 'devops' ? initialProjectId : undefined}
      initialType={initialType}
    />
  );
}

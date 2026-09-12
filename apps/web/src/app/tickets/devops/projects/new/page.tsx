import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../../modules/access/server/current-user';
import { DevOpsProjectCreateScreen } from '../../../../../modules/tickets/components/devops-project-create-screen';

export const metadata: Metadata = { title: 'Novo projeto DevOps · Helpdesk' };

export default async function NewDevOpsProjectPage() {
  const currentUser = await requireAuthenticatedUser('/tickets/devops/projects/new');
  return <DevOpsProjectCreateScreen currentUser={currentUser} />;
}

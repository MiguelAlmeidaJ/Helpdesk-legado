import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { DevOpsProjectsScreen } from '../../../../modules/tickets/components/devops-projects-screen';

export const metadata: Metadata = { title: 'Projetos DevOps · Helpdesk' };

export default async function DevOpsProjectsPage() {
  const currentUser = await requireAuthenticatedUser('/tickets/devops/projects');
  return <DevOpsProjectsScreen currentUser={currentUser} />;
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../../../modules/access/server/current-user';
import { DevOpsProjectDetailScreen } from '../../../../../modules/tickets/components/devops-project-detail-screen';

export const metadata: Metadata = { title: 'Projeto DevOps · Helpdesk' };

export default async function DevOpsProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const projectId = Number(id);
  if (!Number.isSafeInteger(projectId) || projectId < 1) notFound();
  const currentUser = await requireAuthenticatedUser(`/tickets/devops/projects/${projectId}`);
  return <DevOpsProjectDetailScreen currentUser={currentUser} projectId={projectId} />;
}

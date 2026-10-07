import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { DevOpsFlowTemplatesScreen } from '../../../../modules/tickets/components/devops-flow-templates-screen';

export const metadata: Metadata = { title: 'Fluxos de Projetos · Helpdesk' };

export default async function DevOpsFlowTemplatesPage() {
  const currentUser = await requireAuthenticatedUser('/atendimentos/devops/fluxos');
  return <DevOpsFlowTemplatesScreen currentUser={currentUser} />;
}

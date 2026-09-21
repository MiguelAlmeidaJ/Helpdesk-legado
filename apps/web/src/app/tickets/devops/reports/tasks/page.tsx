import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../../modules/access/server/current-user';
import { DevOpsTicketReportScreen } from '../../../../../modules/tickets/components/devops-ticket-report-screen';

export const metadata: Metadata = {
  title: 'Relatório DevOps · Atendimentos · Helpdesk',
  description: 'Relatório nativo de tarefas DevOps por cliente e técnico',
};

export default async function DevOpsTaskReportPage() {
  const currentUser = await requireAuthenticatedUser('/atendimentos/devops/relatorios/tarefas');
  return <DevOpsTicketReportScreen currentUser={currentUser} />;
}

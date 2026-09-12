import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../../modules/access/server/current-user';
import { MarketingTicketReportScreen } from '../../../../../modules/tickets/components/marketing-ticket-report-screen';

export const metadata: Metadata = {
  title: 'Relatório Marketing · Tickets · Helpdesk',
  description: 'Relatório nativo de tarefas de Marketing por cliente e técnico',
};

export default async function MarketingTaskReportPage() {
  const currentUser = await requireAuthenticatedUser('/tickets/marketing/reports/tasks');
  return <MarketingTicketReportScreen currentUser={currentUser} />;
}

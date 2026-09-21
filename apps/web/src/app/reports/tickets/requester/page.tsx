import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../../modules/access/server/current-user';
import { TicketBreakdownReportScreen } from '../../../../../modules/reports/components/ticket-breakdown-report-screen';

export const metadata: Metadata = { title: 'Atendimentos por Solicitante · Helpdesk' };

export default async function Page() {
  const currentUser = await requireAuthenticatedUser('/relatorios/atendimentos/por-solicitante');
  return <TicketBreakdownReportScreen currentUser={currentUser} mode="requester" />;
}

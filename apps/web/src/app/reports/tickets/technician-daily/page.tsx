import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../../modules/access/server/current-user';
import { TicketBreakdownReportScreen } from '../../../../../modules/reports/components/ticket-breakdown-report-screen';

export const metadata: Metadata = { title: 'Atendimentos diários por Técnico · Helpdesk' };

export default async function Page() {
  const currentUser = await requireAuthenticatedUser('/relatorios/atendimentos/diario-por-tecnico');
  return <TicketBreakdownReportScreen currentUser={currentUser} mode="technician-daily" />;
}

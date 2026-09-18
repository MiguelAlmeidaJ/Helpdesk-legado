import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { TicketClientTotalsReportScreen } from '../../../../modules/reports/components/ticket-client-totals-report-screen';

export const metadata: Metadata = {
  title: 'Atendimentos por cliente · Helpdesk',
  description: 'Relatório de atendimentos totais por cliente',
};

export default async function TicketClientTotalsReportPage() {
  const currentUser = await requireAuthenticatedUser(
    '/reports/tickets/by-client',
  );

  return <TicketClientTotalsReportScreen currentUser={currentUser} />;
}

import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { TicketTechnicianTotalsReportScreen } from '../../../../modules/reports/components/ticket-technician-totals-report-screen';

export const metadata: Metadata = {
  title: 'Atendimentos por técnico · Helpdesk',
  description: 'Relatório de atendimentos totais por técnico',
};

export default async function TicketTechnicianTotalsReportPage() {
  const currentUser = await requireAuthenticatedUser(
    '/reports/tickets/by-technician',
  );

  return <TicketTechnicianTotalsReportScreen currentUser={currentUser} />;
}

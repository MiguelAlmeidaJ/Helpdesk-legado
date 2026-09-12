import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { TicketCategoryTotalsReportScreen } from '../../../../modules/reports/components/ticket-category-totals-report-screen';

export const metadata: Metadata = {
  title: 'Atendimentos por categoria · Helpdesk',
  description: 'Relatório de atendimentos totais por categoria',
};

export default async function TicketCategoryTotalsReportPage() {
  const currentUser = await requireAuthenticatedUser(
    '/reports/tickets/by-category',
  );

  return <TicketCategoryTotalsReportScreen currentUser={currentUser} />;
}

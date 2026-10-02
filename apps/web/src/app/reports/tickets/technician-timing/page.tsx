import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { TicketTechnicianTimingReportScreen } from '../../../../modules/reports/components/ticket-technician-timing-report-screen';

export const metadata: Metadata = {
  title: 'Tempo de aceite e conclusão · Relatórios · Helpdesk',
  description: 'Tempo por técnico entre abertura, aceite e conclusão dos chamados',
};

export default async function TechnicianTimingReportPage() {
  const currentUser = await requireAuthenticatedUser(
    '/relatorios/atendimentos/tempo-aceite-conclusao',
  );

  return <TicketTechnicianTimingReportScreen currentUser={currentUser} />;
}

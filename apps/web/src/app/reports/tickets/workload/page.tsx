import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { TicketAnalyticsScreen } from '../../../../modules/reports/components/ticket-analytics-screen';

export default async function WorkloadPage() {
  const currentUser = await requireAuthenticatedUser('/relatorios/atendimentos/tempo-medio');
  return <TicketAnalyticsScreen currentUser={currentUser} mode="workload" />;
}

import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { ReportCenterScreen } from '../../../modules/reports/components/report-center-screen';

export default async function ReportsPage() {
  const currentUser = await requireAuthenticatedUser('/relatorios/atendimentos');
  return <ReportCenterScreen key="tickets" currentUser={currentUser} area="tickets" />;
}

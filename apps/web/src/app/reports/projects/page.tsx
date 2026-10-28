import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { ReportCenterScreen } from '../../../modules/reports/components/report-center-screen';

export default async function ProjectReportsPage() {
  const currentUser = await requireAuthenticatedUser('/relatorios/tarefas-projetos');
  return <ReportCenterScreen key="projects" currentUser={currentUser} area="projects" />;
}

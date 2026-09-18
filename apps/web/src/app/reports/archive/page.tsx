import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { ReportArchiveScreen } from '../../../modules/reports/components/report-archive-screen';

export default async function ArchivePage() {
  const currentUser = await requireAuthenticatedUser('/reports/archive');
  return <ReportArchiveScreen currentUser={currentUser} />;
}

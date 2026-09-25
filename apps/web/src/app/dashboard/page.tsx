import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../modules/access/server/current-user';
import { OperationalDashboardScreen } from '../../modules/dashboard/components/operational-dashboard-screen';

export const metadata: Metadata = {
  title: 'Painel · Helpdesk',
  description: 'Painel operacional e rankings do Helpdesk',
};

export default async function DashboardPage() {
  const currentUser = await requireAuthenticatedUser('/painel');

  return <OperationalDashboardScreen currentUser={currentUser} />;
}

import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../modules/access/server/current-user';
import { DashboardScreen } from '../../modules/dashboard/components/dashboard-screen';

export const metadata: Metadata = {
  title: 'Dashboard · Helpdesk',
  description: 'Painel da nova plataforma Helpdesk',
};

export default async function DashboardPage() {
  const currentUser = await requireAuthenticatedUser('/dashboard');

  return <DashboardScreen currentUser={currentUser} />;
}

import { AppPermission, type CurrentUserResponse } from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { MaintenanceScreen } from '../../../modules/maintenance/components/maintenance-screen';

export const metadata: Metadata = {
  title: 'Manutenção · Administração · Helpdesk',
  description: 'Status, bancos, backups, jobs e importação de dumps',
};

function isSystemAdmin(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) => grant.permission === AppPermission.SystemAdmin,
  );
}

export default async function MaintenancePage() {
  const currentUser = await requireAuthenticatedUser('/administracao/manutencao');
  if (!isSystemAdmin(currentUser)) redirect('/painel');

  return <MaintenanceScreen currentUser={currentUser} />;
}

import {
  AppPermission,
  type CurrentUserResponse,
} from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { OnCallManagementScreen } from '../../../modules/on-call/components/on-call-management-screen';

export const metadata: Metadata = {
  title: 'Plantão · Administração · Helpdesk',
  description: 'Escala semanal e permissões temporárias dos plantonistas',
};

function canManage(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.UsersManageAccess,
  );
}

export default async function OnCallPage() {
  const currentUser = await requireAuthenticatedUser('/administracao/plantao');
  if (!canManage(currentUser)) redirect('/painel');

  return <OnCallManagementScreen currentUser={currentUser} />;
}

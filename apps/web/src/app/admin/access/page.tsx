import { AppPermission, type CurrentUserResponse } from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { AccessManagementScreen } from '../../../modules/access/components/access-management-screen';

export const metadata: Metadata = {
  title: 'Permissões · Administração · Helpdesk',
  description: 'Gestão de tipos de usuário e permissões do Helpdesk',
};

function canManageAccess(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.UsersManageAccess,
  );
}

export default async function AccessManagementPage() {
  const currentUser = await requireAuthenticatedUser('/administracao/permissoes');
  if (!canManageAccess(currentUser)) redirect('/painel');

  return <AccessManagementScreen currentUser={currentUser} />;
}

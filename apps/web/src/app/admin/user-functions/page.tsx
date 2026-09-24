import { AppPermission, type CurrentUserResponse } from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { UserFunctionsScreen } from '../../../modules/users/components/user-functions-screen';

export const metadata: Metadata = {
  title: 'Funções de usuários · Administração · Helpdesk',
};

function canManage(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.UsersManageAccess,
  );
}

export default async function UserFunctionsPage() {
  const currentUser = await requireAuthenticatedUser('/administracao/funcoes-usuarios');
  if (!canManage(currentUser)) redirect('/painel');

  return <UserFunctionsScreen currentUser={currentUser} />;
}

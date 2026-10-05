import { AppPermission, type CurrentUserResponse } from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { UserPermissionsScreen } from '../../../modules/access/components/user-permissions-screen';

export const metadata: Metadata = {
  title: 'Permissões por usuário · Administração · Helpdesk',
  description: 'Exceções de acesso concedidas ou negadas diretamente por usuário',
};

function canManage(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) => grant.permission === AppPermission.SystemAdmin,
  );
}

export default async function UserPermissionsPage() {
  const currentUser = await requireAuthenticatedUser(
    '/administracao/permissoes-usuario',
  );
  if (!canManage(currentUser)) redirect('/painel');

  return <UserPermissionsScreen currentUser={currentUser} />;
}

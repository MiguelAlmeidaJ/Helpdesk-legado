import { AppPermission, type CurrentUserResponse } from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { NavigationAdminScreen } from '../../../modules/navigation/components/navigation-admin-screen';

export const metadata: Metadata = {
  title: 'Navegação · Administração · Helpdesk',
  description: 'Gerenciamento das seções e itens do menu do Helpdesk',
};

function isSystemAdmin(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) => grant.permission === AppPermission.SystemAdmin,
  );
}

export default async function NavigationAdminPage() {
  const currentUser = await requireAuthenticatedUser('/admin/navigation');
  if (!isSystemAdmin(currentUser)) redirect('/dashboard');

  return <NavigationAdminScreen currentUser={currentUser} />;
}

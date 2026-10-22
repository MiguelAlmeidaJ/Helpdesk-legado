import { AppPermission, type CurrentUserResponse } from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { PermissionCatalogScreen } from '../../../modules/access/components/permission-catalog-screen';

export const metadata: Metadata = {
  title: 'Permissões · Administração · Helpdesk',
  description: 'Catálogo de permissões do Helpdesk',
};

function canManageAccess(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) => grant.permission === AppPermission.SystemAdmin,
  );
}

export default async function AccessManagementPage() {
  const currentUser = await requireAuthenticatedUser('/administracao/permissoes');
  if (!canManageAccess(currentUser)) redirect('/painel');

  return <PermissionCatalogScreen currentUser={currentUser} />;
}

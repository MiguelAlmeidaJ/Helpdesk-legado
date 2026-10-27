import { AppPermission } from '@helpdesk/contracts';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { OnCallPermissionsScreen } from '../../../modules/on-call/components/on-call-permissions-screen';

export default async function OnCallPermissionsPage() {
  const user = await requireAuthenticatedUser('/administracao/permissoes-plantao');
  if (!user.grants.some((grant) => grant.permission === AppPermission.SystemAdmin)) redirect('/painel');
  return <OnCallPermissionsScreen currentUser={user} />;
}

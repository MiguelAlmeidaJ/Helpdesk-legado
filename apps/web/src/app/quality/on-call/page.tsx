import {
  AppPermission,
  type CurrentUserResponse,
} from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { OnCallManagementScreen } from '../../../modules/on-call/components/on-call-management-screen';

export const metadata: Metadata = {
  title: 'Plantão · Qualidade · Helpdesk',
  description: 'Escala semanal e permissões temporárias dos plantonistas',
};

function canRead(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.QualityOnCallRead ||
      grant.permission === AppPermission.QualityOnCallManage,
  );
}

export default async function QualityOnCallPage() {
  const currentUser = await requireAuthenticatedUser('/qualidade/plantao');
  if (!canRead(currentUser)) redirect('/painel');

  return <OnCallManagementScreen currentUser={currentUser} />;
}

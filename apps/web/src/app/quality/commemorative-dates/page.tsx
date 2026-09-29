import {
  AppPermission,
  type CurrentUserResponse,
} from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { CommemorativeDatesScreen } from '../../../modules/quality/components/commemorative-dates-screen';

export const metadata: Metadata = {
  title: 'Datas comemorativas · Qualidade · Helpdesk',
  description: 'Feriados nacionais e datas especiais do calendário corporativo',
};

function canRead(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.QualityDatesRead ||
      grant.permission === AppPermission.QualityDatesManage,
  );
}

export default async function CommemorativeDatesPage() {
  const currentUser = await requireAuthenticatedUser('/qualidade/datas-comemorativas');
  if (!canRead(currentUser)) redirect('/painel');

  return <CommemorativeDatesScreen currentUser={currentUser} />;
}

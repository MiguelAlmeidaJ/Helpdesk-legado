import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppPermission, type CurrentUserResponse } from '@helpdesk/contracts';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { FinanceMasterDataScreen } from '../../../../modules/logistics/components/finance-master-data-screen';

export const metadata: Metadata = {
  title: 'Cadastro de Dados Financeiros · Helpdesk',
  description: 'Cadastros auxiliares dos fluxos financeiros e de RD.',
};

function canManage(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.LogisticsExpensesAdminManage,
  );
}

export default async function FinanceMasterDataPage() {
  const currentUser = await requireAuthenticatedUser(
    '/logistica/financeiro/cadastros',
  );
  if (!canManage(currentUser)) redirect('/painel');

  return <FinanceMasterDataScreen currentUser={currentUser} />;
}

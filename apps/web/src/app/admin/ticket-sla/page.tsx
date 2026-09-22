import {
  AppPermission,
  type CurrentUserResponse,
} from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { TicketSlaSettingsScreen } from '../../../modules/tickets/components/ticket-sla-settings-screen';

export const metadata: Metadata = {
  title: 'SLA de Atendimentos · Administração · Helpdesk',
  description: 'Configuração dos SLAs Qualidade e Clerio',
};

function isSystemAdmin(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) => grant.permission === AppPermission.SystemAdmin,
  );
}

export default async function TicketSlaSettingsPage() {
  const currentUser = await requireAuthenticatedUser(
    '/administracao/sla-atendimentos',
  );
  if (!isSystemAdmin(currentUser)) redirect('/painel');

  return <TicketSlaSettingsScreen currentUser={currentUser} />;
}

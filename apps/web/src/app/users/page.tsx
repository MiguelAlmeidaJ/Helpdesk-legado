import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../modules/access/server/current-user';
import { UsersScreen } from '../../modules/users/components/users-screen';

export const metadata: Metadata = { title: 'Usuários · Helpdesk' };

export default async function UsersPage() {
  const currentUser = await requireAuthenticatedUser('/users');
  return <UsersScreen currentUser={currentUser} />;
}

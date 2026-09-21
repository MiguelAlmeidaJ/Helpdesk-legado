import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../modules/access/server/current-user';
import { RadioScreen } from '../../modules/radio/components/radio-screen';

export const metadata: Metadata = { title: 'Rádio · Helpdesk' };

export default async function RadioPage() {
  const currentUser = await requireAuthenticatedUser('/radio');
  return <RadioScreen currentUser={currentUser} />;
}

import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../modules/access/server/current-user';
import { CatalogScreen } from '../../modules/catalog/components/catalog-screen';

export const metadata: Metadata = { title: 'Catálogos · Helpdesk' };

export default async function CatalogPage() {
  const currentUser = await requireAuthenticatedUser('/catalog');
  return <CatalogScreen currentUser={currentUser} />;
}

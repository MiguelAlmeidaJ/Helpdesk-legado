import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { CatalogCheckScreen } from '../../../modules/catalog/components/catalog-check-screen';

export const metadata: Metadata = { title: 'Verificação de Catálogos · Helpdesk' };

export default async function CatalogCheckPage() {
  const currentUser = await requireAuthenticatedUser('/catalog/check');
  return <CatalogCheckScreen currentUser={currentUser} />;
}

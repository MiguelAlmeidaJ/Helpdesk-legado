import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { RegistrationResourceKey } from '@helpdesk/contracts';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';
import { RegistrationScreen } from '../../../modules/registrations/components/registration-screen';

const RESOURCES: Record<string, RegistrationResourceKey> = {
  clientes: 'clients',
  categorias: 'categories',
  'centros-de-custo': 'cost-centers',
  'classificacao-contabil': 'accounting-classifications',
  'indices-de-reajuste': 'adjustment-indexes',
  'formas-de-pagamento': 'payment-methods',
  'tipos-de-despesa': 'expense-types',
  'tipos-de-servico': 'service-types',
  'tipos-de-taxa': 'fee-types',
};

export const metadata: Metadata = { title: 'Cadastros · Helpdesk' };

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource: slug } = await params;
  const resource = RESOURCES[slug];
  if (!resource) notFound();

  const currentUser = await requireAuthenticatedUser(`/cadastros/${slug}`);
  return <RegistrationScreen currentUser={currentUser} resource={resource} />;
}

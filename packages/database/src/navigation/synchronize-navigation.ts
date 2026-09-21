import { DEFAULT_NAVIGATION, portugueseWebHref } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '../index';

type StoredItem = {
  id: number | bigint;
  slug: string;
  label: string;
  href: string | null;
  status: string;
  visibility_condition: string | null;
};

// Upgrade shipped defaults without resetting names, ordering, visibility or
// destinations customized by an administrator. Running twice is a no-op.
export async function synchronizeNavigation(
  db: Pick<Nivel3DatabaseClient, '$queryRaw' | '$executeRaw'>,
): Promise<number> {
  const migrated = new Set([
    'tickets-recurrences',
    'devops-task-new',
    'marketing-task-new',
    'marketing-availability',
    'clients',
    'categories',
    'cost-centers',
    'accounting-classification',
    'adjustment-indexes',
    'payment-methods',
    'expense-types',
    'service-types',
    'fee-types',
  ]);
  const legacyCreateHrefs = new Map<string, Set<string>>([
    ['devops-task-new', new Set(['/atendimentos/novo?type=devops'])],
    ['marketing-task-new', new Set(['/atendimentos/novo?type=marketing'])],
  ]);
  const defaults = new Map(DEFAULT_NAVIGATION.flatMap((section) =>
    section.items.map((item) => [item.slug, item] as const),
  ));
  const rows = await db.$queryRaw<StoredItem[]>`
    SELECT id, slug, label, href, status, visibility_condition FROM navigation_items
  `;
  let updated = 0;
  for (const row of rows) {
    const definition = defaults.get(row.slug);
    let href = row.href ? portugueseWebHref(row.href) : null;
    const legacyCreateHref = legacyCreateHrefs.get(row.slug);
    if (definition?.href && href && legacyCreateHref?.has(href)) {
      href = definition.href;
    }
    let status = row.status;
    let condition = row.visibility_condition;
    let label = row.label;
    if (row.slug === 'dashboard' && label === 'Dashboard') label = 'Painel';
    if (row.slug === 'tickets-timeline' && label === 'Timeline') label = 'Linha do tempo';
    if (migrated.has(row.slug) && !href && status === 'planned' && definition?.status === 'available') {
      href = definition.href ?? null;
      status = 'available';
      condition ??= definition.visibilityCondition
        ? JSON.stringify(definition.visibilityCondition)
        : null;
    }
    if (href === row.href && status === row.status && label === row.label && condition === row.visibility_condition) continue;
    await db.$executeRaw`
      UPDATE navigation_items
      SET label = ${label}, href = ${href}, status = ${status},
          visibility_condition = ${condition}, updated_at = NOW()
      WHERE id = ${row.id}
    `;
    updated++;
  }
  return updated;
}

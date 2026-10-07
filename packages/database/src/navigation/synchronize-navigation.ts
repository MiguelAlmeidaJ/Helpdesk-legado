import { DEFAULT_NAVIGATION, portugueseWebHref } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '../index';

type StoredItem = {
  id: number | bigint;
  section_id: number | bigint;
  slug: string;
  label: string;
  icon: string | null;
  href: string | null;
  status: string;
  visibility_condition: string | null;
  is_active: number;
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
    'maintenance',
    'clients',
    'categories',
    'cost-centers',
    'accounting-classification',
    'adjustment-indexes',
    'payment-methods',
    'expense-types',
    'service-types',
    'fee-types',
    'receivables-accrual',
    'receivables-cashflow',
    'payables',
    'entries',
    'recurring',
    'accounting',
    'report-client-daily',
    'report-requester',
    'report-tech-daily',
    'statements',
  ]);
  const refreshVisibility = new Set([
    'catalogs',
    'catalog-check',
    'clients',
    'categories',
    'cost-centers',
    'accounting-classification',
    'adjustment-indexes',
    'payment-methods',
    'expense-types',
    'service-types',
    'fee-types',
    'devops-projects',
    'devops-tasks',
    'devops-project-new',
    'devops-task-new',
    'marketing-tasks',
    'marketing-task-new',
  ]);
  const forcedDefaults = new Set([
    'rd-data',
    'account-management',
    'entries',
    'recurring',
    'accounting',
  ]);
  const hiddenFromMenu = new Set([
    'receivables-accrual',
    'receivables-cashflow',
    'payables',
  ]);
  const financeItems = new Set([
    'rd-data',
    'account-management',
    'entries',
    'recurring',
    'accounting',
  ]);
  const legacyCreateHrefs = new Map<string, Set<string>>([
    ['devops-task-new', new Set(['/atendimentos/novo?type=devops'])],
    ['marketing-task-new', new Set(['/atendimentos/novo?type=marketing'])],
  ]);
  const defaults = new Map(DEFAULT_NAVIGATION.flatMap((section) =>
    section.items.map((item) => [item.slug, item] as const),
  ));
  const sectionRows = await db.$queryRaw<Array<{ id: number | bigint; slug: string }>>`
    SELECT id, slug FROM navigation_sections
  `;
  const sectionIds = new Map(sectionRows.map((row) => [row.slug, Number(row.id)]));
  const financeSectionId = sectionIds.get('finance') ?? null;

  const rows = await db.$queryRaw<StoredItem[]>`
    SELECT id, section_id, slug, label, icon, href, status, visibility_condition, is_active
    FROM navigation_items
  `;
  let updated = 0;
  for (const row of rows) {
    if (hiddenFromMenu.has(row.slug)) {
      if (row.is_active !== 0) {
        await db.$executeRaw`
          UPDATE navigation_items
          SET is_active = 0, updated_at = NOW()
          WHERE id = ${row.id}
        `;
        updated++;
      }
      continue;
    }
    if (row.slug === 'on-call' || row.slug === 'marketing-availability') {
      if (row.is_active !== 0) {
        await db.$executeRaw`
          UPDATE navigation_items
          SET is_active = 0, updated_at = NOW()
          WHERE id = ${row.id}
        `;
        updated++;
      }
      continue;
    }
    const definition = defaults.get(row.slug);
    let href = row.href ? portugueseWebHref(row.href) : null;
    let status = row.status;
    if (definition && forcedDefaults.has(row.slug)) {
      href = definition.href ?? null;
      status = definition.status;
    }
    const legacyCreateHref = legacyCreateHrefs.get(row.slug);
    if (definition?.href && href && legacyCreateHref?.has(href)) {
      href = definition.href;
    }
    let condition = row.visibility_condition;
    let label = forcedDefaults.has(row.slug) && definition ? definition.label : row.label;
    if (
      definition?.visibilityCondition &&
      (refreshVisibility.has(row.slug) || forcedDefaults.has(row.slug))
    ) {
      condition = JSON.stringify(definition.visibilityCondition);
    }
    if (row.slug === 'dashboard' && label === 'Dashboard') label = 'Painel';
    if (row.slug === 'tickets-timeline' && label === 'Timeline') label = 'Linha do tempo';
    if (migrated.has(row.slug) && !href && status === 'planned' && definition?.status === 'available') {
      href = definition.href ?? null;
      status = 'available';
      condition ??= definition.visibilityCondition
        ? JSON.stringify(definition.visibilityCondition)
        : null;
    }
    const active = definition && forcedDefaults.has(row.slug) ? 1 : row.is_active;
    const targetSectionId =
      financeSectionId && financeItems.has(row.slug)
        ? financeSectionId
        : Number(row.section_id);
    if (
      href === row.href &&
      status === row.status &&
      label === row.label &&
      condition === row.visibility_condition &&
      active === row.is_active &&
      targetSectionId === Number(row.section_id)
    ) continue;
    await db.$executeRaw`
      UPDATE navigation_items
      SET section_id = ${targetSectionId},
          label = ${label}, href = ${href}, status = ${status},
          visibility_condition = ${condition}, is_active = ${active}, updated_at = NOW()
      WHERE id = ${row.id}
    `;
    updated++;
  }
  return updated;
}

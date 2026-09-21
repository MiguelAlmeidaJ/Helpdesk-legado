const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('../apps/api/node_modules/reflect-metadata');
const { NavigationAdminService } = require('../apps/api/dist/modules/navigation/application/navigation-admin.service');
const { NavigationService } = require('../apps/api/dist/modules/navigation/application/navigation.service');
const { NavigationAdminController } = require('../apps/api/dist/modules/navigation/presentation/http/navigation-admin.controller');
const { synchronizeNavigation } = require('../packages/database/dist/navigation/synchronize-navigation');
const { DEFAULT_NAVIGATION, WEB_ROUTE_TRANSLATIONS, portugueseWebHref } = require('../packages/contracts/dist');

test('admin snapshot serializes unsigned MariaDB IDs and joins items to sections', async () => {
  const service = new NavigationAdminService({ $queryRaw: async (sql) =>
    sql.join('').includes('FROM navigation_sections')
      ? [{ id: 17n, slug: 'tickets', label: 'Atendimentos', short_label: 'AT', sort_order: 10, is_active: 1n }]
      : [{ id: 111n, section_id: 17, slug: 'recurrences', label: 'Recorrências', href: '/atendimentos/recorrencias', status: 'available', visibility_condition: null, sort_order: 0, is_active: 0n }],
  });
  const snapshot = JSON.parse(JSON.stringify(await service.snapshot()));
  assert.equal(snapshot.sections[0].id, 17);
  assert.equal(snapshot.sections[0].items[0].id, 111);
  assert.equal(snapshot.sections[0].items[0].sectionId, 17);
  assert.equal(snapshot.sections[0].items[0].active, false);
});

test('section and item creation return JSON-safe numeric IDs', async () => {
  for (const kind of ['Section', 'Item']) {
    const service = new NavigationAdminService({
      $executeRaw: async () => 1,
      $queryRaw: async (sql) => {
        const query = sql.join('');
        if (query.includes('SELECT slug')) return [{ slug: 'tickets' }];
        if (query.includes('SELECT id')) return calls++ ? [{ id: 4294967295n }] : [];
        throw new Error(query);
      },
    });
    let calls = 0;
    const input = { slug: 'new', label: 'Novo', shortLabel: null, sectionId: 17, href: '/atendimentos', status: 'available', sortOrder: 0, active: true, visibilityCondition: null };
    assert.deepEqual(JSON.parse(JSON.stringify(await service['create' + kind](input))), { id: 4294967295 });
  }
});

test('visibility saved by the editor remains visible only to authorized users', async () => {
  let savedCondition;
  const controller = new NavigationAdminController({ updateItem: async (_id, input) => { savedCondition = input.visibilityCondition; return { id: 1 }; } });
  await controller.updateItem(1, { sectionId: 1, slug: 'tickets', label: 'Atendimentos', href: '/atendimentos', status: 'available', sortOrder: 0, active: true, visibilityCondition: { anyPermissions: ['tickets.read'], allPermissions: [], anyRoles: [] } });
  const row = { section_slug: 'tickets', section_label: 'Atendimentos', short_label: 'AT', item_slug: 'tickets', item_label: 'Lista', href: '/atendimentos', status: 'available', visibility_condition: JSON.stringify(savedCondition) };
  const service = new NavigationService({ $queryRawUnsafe: async () => [row] });
  const user = (permission) => ({ grants: permission ? [{ permission }] : [], roleAssignments: [] });
  assert.equal((await service.forUser(user('tickets.read'))).sections.length, 1);
  assert.equal((await service.forUser(user())).sections.length, 0);
  for (const invalid of ['{', '{}', '{"anyPermissions":[]}', '{"anyPermissions":[42]}', '{"unknown":[]}']) {
    row.visibility_condition = invalid;
    assert.equal((await service.forUser(user('tickets.read'))).sections.length, 0);
  }
});

test('navigation upgrade enables migrated screens, preserves customization and is idempotent', async () => {
  const rows = [
    { id: 1n, slug: 'tickets-recurrences', label: 'Rotinas', href: null, status: 'planned', visibility_condition: null, is_active: 0, sort_order: 99 },
    { id: 2n, slug: 'devops-task-new', label: 'Nova Tarefa', href: '/custom', status: 'planned', visibility_condition: '{"anyRoles":["custom"]}' },
    { id: 3n, slug: 'report-client-analytic', label: 'Análise', href: '/reports/tickets/analytics?source=tickets#table', status: 'available', visibility_condition: null },
    { id: 4n, slug: 'marketing-availability', label: 'Disponibilidade', href: null, status: 'planned', visibility_condition: null },
    { id: 5n, slug: 'marketing-task-new', label: 'Nova Tarefa', href: '/tickets/new?type=marketing', status: 'available', visibility_condition: null },
  ];
  const original = structuredClone(rows);
  const db = { $queryRaw: async () => rows, $executeRaw: async (_sql, label, href, status, visibility_condition, id) => {
    Object.assign(rows.find(row => row.id === id), { label, href, status, visibility_condition });
    return 1;
  } };
  assert.equal(await synchronizeNavigation(db), 3);
  assert.equal(rows[0].href, '/atendimentos/recorrencias');
  assert.equal(rows[0].label, 'Rotinas');
  assert.equal(rows[0].is_active, 0);
  assert.equal(rows[0].sort_order, 99);
  assert.deepEqual(JSON.parse(rows[0].visibility_condition), { anyPermissions: ['tickets.read'] });
  assert.deepEqual(rows[1], original[1]);
  assert.equal(rows[2].href, '/relatorios/atendimentos/analitico?source=tickets#table');
  assert.deepEqual(rows[3], original[3]);
  assert.equal(rows[4].href, '/atendimentos/marketing/nova-tarefa');
  assert.equal(await synchronizeNavigation(db), 0);
});

test('browser URL translation preserves IDs, filters and unrelated paths', () => {
  assert.equal(portugueseWebHref('/tickets/devops/projects/42?tab=tasks'), '/atendimentos/devops/projetos/42?tab=tasks');
  assert.equal(portugueseWebHref('/tickets/new?type=devops&projectId=42'), '/atendimentos/novo?type=devops&projectId=42');
  assert.equal(portugueseWebHref('/registrations/clients'), '/cadastros/clientes');
  for (const unchanged of ['/api/tickets', '/tickets-other', '/atendimentos', 'https://example.com/tickets']) {
    assert.equal(portugueseWebHref(unchanged), unchanged);
  }
});

test('all available menu destinations resolve to implemented Next pages', () => {
  const items = DEFAULT_NAVIGATION.flatMap(section => section.items);
  for (const slug of ['tickets-recurrences', 'devops-task-new', 'marketing-task-new', 'clients', 'categories', 'cost-centers', 'accounting-classification', 'adjustment-indexes', 'payment-methods', 'expense-types', 'service-types', 'fee-types']) {
    assert.equal(items.find(item => item.slug === slug).status, 'available', slug);
  }
  for (const item of items) {
    if (item.status !== 'available') { assert.equal(item.href, undefined, item.slug); continue; }
    const pathname = item.href.split('?')[0];
    const mapping = WEB_ROUTE_TRANSLATIONS.find(([, target]) => pathname === target || pathname.startsWith(target + '/'));
    assert.ok(mapping, item.href);
    const route = mapping[0] + pathname.slice(mapping[1].length);
    const directPage = path.join(__dirname, '../apps/web/src/app', route, 'page.tsx');
    const dynamicRegistrationPage = route.startsWith('/registrations/')
      ? path.join(__dirname, '../apps/web/src/app/registrations/[resource]/page.tsx')
      : null;
    assert.ok(
      fs.existsSync(directPage) ||
        (dynamicRegistrationPage && fs.existsSync(dynamicRegistrationPage)),
      item.href,
    );
  }
});

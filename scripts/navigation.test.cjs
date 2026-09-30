const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('../apps/api/node_modules/reflect-metadata');

const {
  NavigationService,
} = require('../apps/api/dist/modules/navigation/application/navigation.service');
const {
  DEFAULT_NAVIGATION,
  WEB_ROUTE_TRANSLATIONS,
  portugueseWebHref,
} = require('../packages/contracts/dist');

test('code navigation filters sections by RBAC permissions', async () => {
  const service = new NavigationService();
  const user = {
    grants: [
      { permission: 'quality.on-call.read' },
      { permission: 'registrations.clients.read' },
    ],
    roleAssignments: [],
  };

  const response = await service.forUser(user);
  const sections = new Map(response.sections.map((section) => [section.id, section]));

  assert.equal(sections.has('primary'), true);
  assert.equal(sections.has('quality'), true);
  assert.equal(sections.has('registrations'), true);
  assert.equal(sections.has('finance'), false);
  assert.equal(sections.has('administration'), false);

  assert.deepEqual(
    sections.get('quality').items.map((item) => item.id),
    ['quality-on-call'],
  );
  assert.equal(
    sections.get('registrations').items.some((item) => item.id === 'clients'),
    true,
  );
});

test('system admin receives all code-defined navigation sections', async () => {
  const service = new NavigationService();
  const user = {
    grants: [{ permission: 'system.admin' }],
    roleAssignments: [],
  };

  const response = await service.forUser(user);
  assert.deepEqual(
    response.sections.map((section) => section.id),
    DEFAULT_NAVIGATION.map((section) => section.slug),
  );
});

test('browser URL translations never contain identity redirects', () => {
  for (const [source, destination] of WEB_ROUTE_TRANSLATIONS) {
    assert.notEqual(source, destination, source);
  }
});

test('browser URL translation preserves IDs, filters and unrelated paths', () => {
  assert.equal(
    portugueseWebHref('/tickets/devops/projects/42?tab=tasks'),
    '/atendimentos/devops/projetos/42?tab=tasks',
  );
  assert.equal(
    portugueseWebHref('/tickets/new?type=devops&projectId=42'),
    '/atendimentos/novo?type=devops&projectId=42',
  );
  assert.equal(
    portugueseWebHref('/registrations/clientes'),
    '/cadastros/clientes',
  );
  assert.equal(
    portugueseWebHref('/reports/tickets/client-daily'),
    '/relatorios/atendimentos/diario-por-cliente',
  );
  assert.equal(
    portugueseWebHref('/logistics/finance/statements'),
    '/extratos',
  );
  assert.equal(portugueseWebHref('/radio'), '/radio');
  assert.equal(
    portugueseWebHref('/admin/ticket-sla'),
    '/administracao/sla-atendimentos',
  );
  assert.equal(
    portugueseWebHref('/admin/on-call'),
    '/qualidade/plantao',
  );
  assert.equal(
    portugueseWebHref('/quality/on-call'),
    '/qualidade/plantao',
  );
  assert.equal(
    portugueseWebHref('/quality/commemorative-dates'),
    '/qualidade/datas-comemorativas',
  );
  assert.equal(
    portugueseWebHref('/admin/maintenance'),
    '/administracao/manutencao',
  );
  assert.equal(
    portugueseWebHref('/tickets/availability/legacy'),
    '/atendimentos/disponibilidade/antiga',
  );

  for (const unchanged of [
    '/api/tickets',
    '/tickets-other',
    '/atendimentos',
    'https://example.com/tickets',
  ]) {
    assert.equal(portugueseWebHref(unchanged), unchanged);
  }
});

test('all available code-defined menu destinations resolve to implemented Next pages', () => {
  const items = DEFAULT_NAVIGATION.flatMap((section) => section.items);
  assert.equal(items.filter((item) => item.status === 'planned').length, 0);

  for (const item of items) {
    if (item.status !== 'available') {
      assert.equal(item.href, undefined, item.slug);
      continue;
    }

    const pathname = item.href.split('?')[0];
    const mapping = WEB_ROUTE_TRANSLATIONS.find(
      ([, target]) => pathname === target || pathname.startsWith(target + '/'),
    );
    const route = mapping
      ? mapping[0] + pathname.slice(mapping[1].length)
      : pathname;

    const directPage = path.join(
      __dirname,
      '../apps/web/src/app',
      route,
      'page.tsx',
    );
    const dynamicRegistrationPage = route.startsWith('/registrations/')
      ? path.join(
          __dirname,
          '../apps/web/src/app/registrations/[resource]/page.tsx',
        )
      : null;

    assert.ok(
      fs.existsSync(directPage) ||
        (dynamicRegistrationPage && fs.existsSync(dynamicRegistrationPage)),
      item.href,
    );
  }
});

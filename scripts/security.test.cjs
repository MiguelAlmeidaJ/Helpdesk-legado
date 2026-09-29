const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_WEB_ORIGINS,
  allowedWebOrigins,
  normalizeOrigin,
} = require('../apps/api/dist/core/security/allowed-origins');

const EXPECTED = [
  'http://localhost:4204',
  'http://192.168.199.234',
  'http://192.168.199.234:4204',
  'https://helpdesk.nivel3ti.com.br',
];

test('CORS default allowlist contains only approved Helpdesk origins', () => {
  assert.deepEqual([...DEFAULT_WEB_ORIGINS], EXPECTED);
  assert.deepEqual([...allowedWebOrigins()].sort(), [...EXPECTED].sort());
});

test('WEB_ORIGIN may restrict the fixed allowlist but cannot expand it', () => {
  const origins = allowedWebOrigins([
    'http://localhost:4204',
    'https://evil.example.com',
    'http://192.168.199.234:4204',
  ].join(','));

  assert.deepEqual(
    [...origins].sort(),
    ['http://192.168.199.234:4204', 'http://localhost:4204'].sort(),
  );
  assert.equal(origins.has('https://evil.example.com'), false);
});

test('unapproved ports, schemes and hosts are rejected', () => {
  const origins = allowedWebOrigins([
    'http://localhost:3000',
    'https://192.168.199.234',
    'http://helpdesk.nivel3ti.com.br',
    'https://helpdesk.nivel3ti.com.br.evil.example',
  ].join(','));

  assert.equal(origins.size, 0);
});

test('origin normalization removes paths but preserves origin identity', () => {
  assert.equal(
    normalizeOrigin('https://helpdesk.nivel3ti.com.br/qualquer/rota?x=1'),
    'https://helpdesk.nivel3ti.com.br',
  );
  assert.equal(normalizeOrigin('not-an-origin'), null);
});

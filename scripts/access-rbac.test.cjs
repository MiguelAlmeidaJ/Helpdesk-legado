const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  AppPermission,
} = require('../packages/contracts/dist');
const {
  translateRbacAccess,
} = require('../apps/api/dist/modules/access/application/rbac-permission-translator');

const legacySession = {
  id: 10,
  name: 'Usuário Teste',
  login: 'teste',
  functionId: null,
  modules: {
    1: '9999999999',
    2: '9999999999',
    3: '9999999999',
    4: '9999999999',
    5: '9999999999',
    6: '9999999999',
    7: '9999999999',
    8: '9999999999',
    9: '9999999999',
  },
};

function snapshot(permissionSlugs = []) {
  return {
    active: true,
    roleSlugs: [],
    permissionSlugs: new Set(permissionSlugs),
    onCallAreas: [],
  };
}

test('legacy positional modules no longer grant application permissions', () => {
  const user = translateRbacAccess(legacySession, snapshot());
  assert.equal(user.accessSource, 'rbac');
  assert.deepEqual(user.grants, []);
});

test('canonical RBAC slugs grant registrations, logistics and radio', () => {
  const user = translateRbacAccess(
    legacySession,
    snapshot([
      'cadastros.clientes.visualizar',
      'logistica.agenda.visualizar',
      'atendimentos.radio',
    ]),
  );

  const permissions = new Set(user.grants.map((grant) => grant.permission));
  assert.equal(permissions.has(AppPermission.RegistrationsClientsRead), true);
  assert.equal(permissions.has(AppPermission.LogisticsVehicleAgendaRead), true);
  assert.equal(permissions.has(AppPermission.TicketsRadio), true);
});

test('sector ticket RBAC slugs expose only their navigation grants', () => {
  const user = translateRbacAccess(
    legacySession,
    snapshot([
      'devops.atendimentos.visualizar',
      'marketing.atendimentos.criar',
    ]),
  );

  const permissions = new Set(user.grants.map((grant) => grant.permission));
  assert.equal(permissions.has(AppPermission.TicketsDevOpsRead), true);
  assert.equal(permissions.has(AppPermission.TicketsMarketingCreate), true);
  assert.equal(permissions.has(AppPermission.TicketsRead), false);
});

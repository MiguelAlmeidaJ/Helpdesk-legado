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

test('simplified cadastro and logistics slugs translate to native grants', () => {
  const user = translateRbacAccess(
    legacySession,
    snapshot([
      'cadastros.clientes.visualizar',
      'logistica.agenda.agendar',
      'logistica.rd.criar',
    ]),
  );

  const permissions = new Set(user.grants.map((grant) => grant.permission));
  assert.equal(permissions.has(AppPermission.RegistrationsClientsRead), true);
  assert.equal(permissions.has(AppPermission.LogisticsVehicleAgendaManage), true);
  assert.equal(permissions.has(AppPermission.LogisticsExpensesManage), true);
});

test('page-granular DevOps and Marketing slugs expose native navigation grants', () => {
  const user = translateRbacAccess(
    legacySession,
    snapshot([
      'devops.projetos.visualizar',
      'marketing.tarefas.criar',
      'marketing.tarefas.finalizar',
    ]),
  );

  const permissions = new Set(user.grants.map((grant) => grant.permission));
  assert.equal(permissions.has(AppPermission.DevOpsProjectsRead), true);
  assert.equal(permissions.has(AppPermission.TicketsDevOpsRead), true);
  assert.equal(permissions.has(AppPermission.MarketingTasksCreate), true);
  assert.equal(permissions.has(AppPermission.MarketingTasksClose), true);
  assert.equal(permissions.has(AppPermission.TicketsMarketingCreate), true);
  assert.equal(permissions.has(AppPermission.TicketsRead), false);
});

test('reports and finance use dedicated permissions', () => {
  const user = translateRbacAccess(
    legacySession,
    snapshot([
      'relatorios.visualizar',
      'relatorios.gerar_pdf',
      'financeiro.visualizar',
      'financeiro.editar',
    ]),
  );

  const permissions = new Set(user.grants.map((grant) => grant.permission));
  assert.equal(permissions.has(AppPermission.ReportsRead), true);
  assert.equal(permissions.has(AppPermission.ReportsPdf), true);
  assert.equal(permissions.has(AppPermission.FinanceRead), true);
  assert.equal(permissions.has(AppPermission.FinanceManage), true);
  assert.equal(permissions.has(AppPermission.LogisticsStatementsRead), true);
});

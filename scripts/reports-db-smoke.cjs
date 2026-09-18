// Read-only parity checks against the configured legacy database. Run after build.
const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
if (existsSync('.env')) process.loadEnvFile('.env');
const { createNivel3Client } = require('../packages/database/dist');
const base = '../apps/api/dist/modules/reports/infrastructure/';
const { PrismaTicketAnalyticsRepository } = require(base + 'prisma-ticket-analytics.repository');
const { PrismaTicketClientTotalsReportRepository } = require(base + 'prisma-ticket-client-totals-report.repository');
const { PrismaTicketTechnicianTotalsReportRepository } = require(base + 'prisma-ticket-technician-totals-report.repository');
const { PrismaTicketCategoryTotalsReportRepository } = require(base + 'prisma-ticket-category-totals-report.repository');

const db = createNivel3Client();
async function main() {
  const [user] = await db.$queryRawUnsafe('SELECT user_id FROM usuarios WHERE tipo_usuario <> 2 AND user_sts = 1 LIMIT 1');
  assert.ok(user, 'An active internal user is required for read-only parity');
  const userId = user.user_id;
  const filters = { startDate: '2026-02-01', endDate: '2026-02-28', source: 'tickets', clientId: 0, locationId: 0, technicianId: 0, level: 0 };
  const repo = new PrismaTicketAnalyticsRepository(db);
  const counts = {};
  for (const [source, table] of [['tickets', 'atendimentos'], ['tasks', 'tarefas'], ['improvements', 'melhorias']]) {
    const report = await repo.analytics(userId, { ...filters, source });
    const [legacy] = await db.$queryRawUnsafe(`SELECT COUNT(*) AS total FROM ${table} a INNER JOIN clientes c ON c.clt_id = a.cliente WHERE a.status > 0 AND a.abertura >= ? AND a.abertura < DATE_ADD(?, INTERVAL 1 DAY) ${source === 'tasks' ? '' : 'AND a.nivel IN (1,2,3,4,5)'}`, filters.startDate, filters.endDate);
    assert.equal(report.total, Number(legacy.total));
    counts[source] = report.total;
    JSON.stringify(report);
    console.log(`${source}: ${report.total} rows match the legacy period and levels`);
  }
  const unified = await repo.analytics(userId, { ...filters, source: 'unified' });
  assert.equal(unified.total, counts.tickets + counts.tasks);
  const time = await repo.analytics(userId, { ...filters, view: 'time' });
  assert.ok(time.total >= counts.tickets);
  for (const [Repository, join] of [
    [PrismaTicketClientTotalsReportRepository, 'clientes g ON g.clt_id = a.cliente'],
    [PrismaTicketTechnicianTotalsReportRepository, 'usuarios g ON g.user_id = a.tecnico'],
    [PrismaTicketCategoryTotalsReportRepository, 'categorias g ON g.cat_id = a.categoria'],
  ]) {
    const report = await new Repository(db).get({ ...filters, userId });
    const [legacy] = await db.$queryRawUnsafe(`SELECT COUNT(*) AS total FROM atendimentos a INNER JOIN ${join} WHERE a.status > 0 AND a.nivel IN (1,2,3) AND a.abertura >= ? AND a.abertura < DATE_ADD(?, INTERVAL 1 DAY)`, filters.startDate, filters.endDate);
    assert.equal(report.total, Number(legacy.total));
    assert.equal(report.total, report.rows.reduce((sum, row) => sum + row.level1 + row.level2 + row.level3, 0));
    JSON.stringify(report);
  }
  const workload = await repo.workload(userId);
  const legacyWorkload = await db.$queryRawUnsafe(`SELECT u.user_id, a.status, COUNT(a.id) AS total FROM usuarios u LEFT JOIN atendimentos a ON a.tecnico = u.user_id AND a.status IN (1,2,3) WHERE u.user_sts = 1 AND u.user_funcao IN (5,6) GROUP BY u.user_id, a.status`);
  for (const row of workload.rows) {
    const expected = legacyWorkload.filter(item => item.user_id === row.technicianId);
    assert.equal(row.open, expected.filter(item => [1, 2].includes(item.status)).reduce((sum, item) => sum + Number(item.total), 0));
    assert.equal(row.waiting, expected.filter(item => item.status === 3).reduce((sum, item) => sum + Number(item.total), 0));
  }
  JSON.stringify(workload);
  const catalog = await repo.catalog(userId, 0);
  if (catalog.clients.length) await repo.catalog(userId, catalog.clients[0].id);
  const [external] = await db.$queryRawUnsafe('SELECT user_id FROM usuarios WHERE tipo_usuario = 2 AND user_sts = 1 LIMIT 1');
  if (external) {
    const scope = await db.$queryRawUnsafe('SELECT cliente_id FROM clientes_usuarios WHERE usuario_id = ?', external.user_id);
    const report = await repo.analytics(external.user_id, { ...filters, source: 'unified' });
    assert.ok(report.rows.every(row => scope.some(client => client.cliente_id === row.clientId)));
    const forbidden = catalog.clients.find(client => !scope.some(item => item.cliente_id === client.id));
    if (forbidden) assert.equal((await repo.analytics(external.user_id, { ...filters, clientId: forbidden.id })).total, 0);
  }
  console.log('OK: totals, unified report, workload, catalogs and external scope; no database writes.');
}
main().catch(error => { console.error('Read-only report smoke failed:', error.code ?? error.name, error instanceof assert.AssertionError ? error.message : 'Check database availability and schema.'); process.exitCode = 1; }).finally(() => db.$disconnect());

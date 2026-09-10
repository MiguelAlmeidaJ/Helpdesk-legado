const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, writeFile, readFile, rm, symlink } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
require('../apps/api/node_modules/reflect-metadata');
const base = '../apps/api/dist/modules/reports/';
const { analyticsFilters } = require(base + 'presentation/http/ticket-analytics.controller');
const { parseReportQuery } = require(base + 'presentation/http/report-query');
const { PrismaTicketAnalyticsRepository } = require(base + 'infrastructure/prisma-ticket-analytics.repository');
const { resolveTicketReportVisibility } = require(base + 'infrastructure/ticket-report-visibility');
const { analyticsPdf, reportZip } = require(base + 'infrastructure/report-files');
const { ReportArchive } = require(base + 'infrastructure/report-archive');

const filters = { startDate: '2026-09-01', endDate: '2026-09-09', clientId: 0, locationId: 0, technicianId: 0, level: 0, source: 'tickets' };

test('report query rejects invalid dates, arrays, levels, source and identifier injection', () => {
  assert.throws(() => parseReportQuery('2026-02-30', '2026-03-01'));
  assert.throws(() => parseReportQuery('2026-09-10', '2026-09-01'));
  assert.throws(() => parseReportQuery(['2026-09-01'], '2026-09-09'));
  assert.throws(() => parseReportQuery(undefined, undefined, '1e0'));
  assert.throws(() => analyticsFilters({ clientId: '1 OR 1=1' }));
  assert.throws(() => analyticsFilters({ source: 'usuarios' }));
  assert.throws(() => analyticsFilters({ level: '6' }));
  assert.equal(analyticsFilters({ level: '5', source: 'unified' }).level, 5);
});

test('missing users and external users without companies fail closed', async () => {
  const visibility = await resolveTicketReportVisibility({ $queryRawUnsafe: async () => [] }, 999);
  assert.deepEqual(visibility, { restrictClients: true, clientIds: [] });
  const queries = [];
  const database = { $queryRawUnsafe: async (sql, ...params) => {
    queries.push({ sql, params });
    return sql.includes('SELECT tipo_usuario') ? [{ tipo_usuario: 2 }] : [];
  } };
  const repository = new PrismaTicketAnalyticsRepository(database);
  assert.equal((await repository.analytics(1, filters)).rows.length, 0);
  assert.ok(queries.find(query => query.sql.includes('FROM atendimentos a')).sql.includes('1 = 0'));
  assert.deepEqual((await repository.workload(1)).rows, []);
});

test('every branch of unified analytics enforces company scope and exclusive end boundary', async () => {
  const queries = [];
  const database = { $queryRawUnsafe: async (sql, ...params) => {
    queries.push({ sql, params });
    if (sql.includes('SELECT tipo_usuario')) return [{ tipo_usuario: 2 }];
    if (sql.includes('FROM clientes_usuarios')) return [{ cliente_id: 7 }];
    return [];
  } };
  const repository = new PrismaTicketAnalyticsRepository(database);
  await repository.analytics(12, { ...filters, clientId: 999, source: 'unified' });
  const reports = queries.filter(query => query.sql.includes('AS openingDescription'));
  assert.equal(reports.length, 2);
  for (const query of reports) {
    assert.match(query.sql, /a\.cliente IN \(\?\)/);
    assert.match(query.sql, /a\.abertura < DATE_ADD\(\?, INTERVAL 1 DAY\)/);
    assert.ok(query.params.includes(7)); assert.ok(query.params.includes(999));
    assert.ok(!query.sql.includes('999'));
  }
  assert.deepEqual((await repository.catalog(12, 999)).locations, []);
  assert.equal(queries.filter(query => query.sql.includes('FROM locais')).length, 0);
});

test('time report preserves scheduled tickets and all levels when no level is selected', async () => {
  const queries = [];
  const repository = new PrismaTicketAnalyticsRepository({ $queryRawUnsafe: async sql => {
    queries.push(sql);
    return sql.includes('SELECT tipo_usuario') ? [{ tipo_usuario: 1 }] : [];
  } });
  await repository.analytics(1, { ...filters, view: 'time' });
  const sql = queries.find(sql => sql.includes('AS openingDescription'));
  assert.ok(!sql.includes('a.status > 0'));
  assert.ok(!sql.includes('a.nivel IN'));
  const parsed = analyticsFilters({ view: 'time' });
  assert.equal(parsed.startDate, parsed.endDate);
  assert.throws(() => analyticsFilters({ view: 'unknown' }));
});

test('PDF preserves long descriptions, accents, multiple pages and valid xref offsets', () => {
  const report = { filters, total: 1, rows: [{ id: 1, source: 'tickets', clientName: 'João', openingDescription: 'x'.repeat(12000) + 'FINAL-DA-DESCRICAO', closingDescription: 'Conclusão', locationName: '', locationAddress: '', requesterName: '', technicianName: '', openedAt: '', closedAt: null, level: 1, type: 1, method: 1, status: 4 } ] };
  const pdf = analyticsPdf(report), text = pdf.toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.match(text, /João/); assert.match(text, /FINAL-DA-DESCRICAO/); assert.match(text, /Conclusão/);
  const count = Number(text.match(/\/Count (\d+)/)[1]); assert.ok(count > 1);
  const xref = Number(text.match(/startxref\n(\d+)/)[1]); assert.equal(text.slice(xref, xref + 4), 'xref');
  const offsets = text.slice(xref).split('\n').slice(3).filter(line => /^\d{10} 00000 n/.test(line));
  offsets.forEach((line, index) => assert.ok(text.slice(Number(line.slice(0, 10))).startsWith(`${index + 1} 0 obj`)));
});

test('ZIP store headers contain UTF-8 filename, CRC and original bytes', () => {
  const zip = reportZip([{ name: 'João.pdf', data: Buffer.from('123456789') }]);
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  assert.equal(zip.readUInt32LE(14), 0xcbf43926);
  assert.equal(zip.readUInt16LE(6), 0x800);
  assert.ok(zip.includes(Buffer.from('João.pdf')));
  assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50);
});

test('archive denies external users, traversal and symlink downloads; preserves unrelated files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'helpdesk-reports-'));
  const previous = process.env.REPORT_ARCHIVE_DIR;
  process.env.REPORT_ARCHIVE_DIR = root;
  try {
    const archive = new ReportArchive({ $queryRawUnsafe: async () => [{ tipo_usuario: 2 }] });
    await assert.rejects(() => archive.authorize(1));
    await writeFile(path.join(root, 'keep.txt'), 'keep');
    await writeFile(path.join(root, 'existing.pdf'), '%PDF-1.4');
    await assert.rejects(() => archive.read('../existing.pdf'));
    await assert.rejects(() => archive.read('C:\\existing.pdf'));
    await assert.rejects(() => archive.read('keep.txt'));
    const name = await archive.save(7, '2026-09-01', '2026-09-09', Buffer.from('%PDF-1.4'));
    assert.equal((await archive.list()).length, 2);
    assert.equal((await archive.read(name)).toString(), '%PDF-1.4');
    await archive.remove(name);
    assert.equal((await readFile(path.join(root, 'keep.txt'))).toString(), 'keep');
    try {
      await symlink(path.join(root, 'existing.pdf'), path.join(root, 'link.pdf'));
      await assert.rejects(() => archive.read('link.pdf'));
    } catch (error) { if (error.code !== 'EPERM') throw error; }
  } finally {
    if (previous === undefined) delete process.env.REPORT_ARCHIVE_DIR; else process.env.REPORT_ARCHIVE_DIR = previous;
    // Only the unique temporary directory created by this test is removed.
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('helpdesk-reports-'));
    await rm(root, { recursive: true, force: true });
  }
});

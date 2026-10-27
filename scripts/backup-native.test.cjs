const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { SqlServerBackups } = require('../apps/api/dist/modules/maintenance/application/sqlserver-backups');

async function sandbox(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'helpdesk-backup-'));
  const old = process.env.MAINTENANCE_SQLSERVER_BACKUP_DIR;
  const oldProcedure = process.env.MAINTENANCE_SQLSERVER_VERIFY_PROCEDURE;
  process.env.MAINTENANCE_SQLSERVER_BACKUP_DIR = root;
  delete process.env.MAINTENANCE_SQLSERVER_VERIFY_PROCEDURE;
  try { await run(root); } finally {
    if (old === undefined) delete process.env.MAINTENANCE_SQLSERVER_BACKUP_DIR;
    else process.env.MAINTENANCE_SQLSERVER_BACKUP_DIR = old;
    if (oldProcedure === undefined) delete process.env.MAINTENANCE_SQLSERVER_VERIFY_PROCEDURE;
    else process.env.MAINTENANCE_SQLSERVER_VERIFY_PROCEDURE = oldProcedure;
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('native backup verifies before publishing and hides changed files', () => sandbox(async () => {
  const calls = [];
  const store = new SqlServerBackups({ async $executeRawUnsafe(sql, file) {
    calls.push(sql);
    if (sql.includes('BACKUP DATABASE')) {
      assert.match(sql, /COPY_ONLY, CHECKSUM, NOINIT, STOP_ON_ERROR/);
      await fs.writeFile(file, 'backup fixture');
    } else assert.match(sql, /RESTORE VERIFYONLY .* CHECKSUM, STOP_ON_ERROR/);
    return 0;
  } });
  const [backup] = await store.create('manual');
  assert.equal(calls.length, 2);
  assert.ok(backup.verifiedAt);
  assert.equal((await store.list())[0].name, backup.name);
  await fs.appendFile(await store.file(backup.name), 'tampered');
  assert.deepEqual(await store.list(), []);
}));

test('verification failure leaves no published successful backup', () => sandbox(async root => {
  const store = new SqlServerBackups({ async $executeRawUnsafe(sql, file) {
    if (sql.includes('BACKUP DATABASE')) { await fs.writeFile(file, 'partial'); return 0; }
    throw new Error('checksum failure');
  } });
  await assert.rejects(store.create('manual'), /checksum failure/);
  assert.deepEqual(await store.list(), []);
  assert.ok((await fs.readdir(root)).every(name => !name.endsWith('.json')));
}));

test('missing configuration and traversal cannot reach SQL or other files', () => sandbox(async () => {
  const store = new SqlServerBackups({ async $executeRawUnsafe() { assert.fail('SQL must not execute'); } });
  await assert.rejects(store.file('../secret.bak'), /inválido/);
  delete process.env.MAINTENANCE_SQLSERVER_BACKUP_DIR;
  await assert.rejects(store.create('manual'), /Configure/);
  assert.equal((await store.status()).configured, false);
}));

test('concurrent request is rejected and lock is released after failure', () => sandbox(async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const store = new SqlServerBackups({ async $executeRawUnsafe() { await gate; throw new Error('backup failure'); } });
  const first = store.create('manual');
  await assert.rejects(store.create('manual'), /andamento/);
  release();
  await assert.rejects(first, /backup failure/);
  await assert.rejects(store.create('manual'), /backup failure/);
}));

test('restricted verification uses the fixed procedure and a bound file parameter', () => sandbox(async () => {
  process.env.MAINTENANCE_SQLSERVER_VERIFY_PROCEDURE = 'true';
  const store = new SqlServerBackups({ async $executeRawUnsafe(sql, file) {
    if (sql.includes('BACKUP DATABASE')) await fs.writeFile(file, 'backup fixture');
    else assert.equal(sql, 'EXEC master.dbo.helpdesk_verify_native_backup @file = @P1;');
    assert.ok(file.endsWith('.bak'));
    return 0;
  } });
  assert.ok((await store.create('manual'))[0].verifiedAt);
}));

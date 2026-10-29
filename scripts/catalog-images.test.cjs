// Full HTTP multipart flow + SQL Server temp tables and isolated storage.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const { randomBytes } = require('node:crypto');
process.loadEnvFile(path.resolve(__dirname, '../.env'));
const apiRequire = id => require(require.resolve(id, { paths: [path.resolve(__dirname, '../apps/api')] }));
const { Module } = apiRequire('@nestjs/common');
const { NestFactory } = apiRequire('@nestjs/core');
const { createNivel3Client } = require('../packages/database/dist');
const base = '../apps/api/dist/modules/';
const { CatalogController } = require(base + 'catalog/presentation/http/catalog.controller');
const { CatalogService } = require(base + 'catalog/application/catalog.service');
const { CatalogImageStorageService } = require(base + 'catalog/application/catalog-image-storage.service');
const { LegacySessionGuard } = require(base + 'access/presentation/http/legacy-session.guard');
const { GUARDS_METADATA } = apiRequire('@nestjs/common/constants');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4dsAAAAASUVORK5CYII=', 'base64');

test('catalog HTTP uploads, IDs, authorization, linking, integrity and failed-write cleanup work on SQL Server', async () => {
  const db = createNivel3Client(), suffix = randomBytes(8).toString('hex');
  const images = '##catalog_images_' + suffix, catalogs = '##catalogs_' + suffix;
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-images-test-'));
  const previous = process.env.CATALOG_UPLOAD_DIR; process.env.CATALOG_UPLOAD_DIR = temp;
  let app, failing = false;
  let actor = { id: 41, grants: [{ permission: 'catalog.ti.create', scope: 'all' }] };
  const originalGuards = Reflect.getMetadata(GUARDS_METADATA, CatalogController);
  assert.ok(originalGuards.includes(LegacySessionGuard), 'Production controller remains guarded');
  const rewrite = sql => sql.replace(/\bcatalog_images\b/g, images).replace(/\bcatalogos\b/g, catalogs);
  const fixture = {
    $queryRawUnsafe: (sql, ...params) => {
      if (sql.includes('FROM sys.tables')) { assert.ok(sql.includes("OBJECT_ID(N'dbo.catalogos'")); return Promise.resolve([{ found: 1 }]); }
      if (failing && sql.includes('INSERT INTO catalog_images')) throw Error('Simulated metadata failure');
      return db.$queryRawUnsafe(rewrite(sql), ...params);
    },
    $executeRawUnsafe: (sql, ...params) => sql.startsWith('IF OBJECT_ID') ? Promise.resolve(0) : db.$executeRawUnsafe(rewrite(sql), ...params),
  };
  const upload = async (base, bytes = png, mime = 'image/png') => {
    const form = new FormData(); form.append('file', new Blob([bytes], { type: mime }), 'fixture.png');
    form.append('width', '1'); form.append('height', '1');
    return fetch(base + '/catalog/images', { method: 'POST', body: form });
  };
  try {
    await db.$executeRawUnsafe(`CREATE TABLE ${catalogs}(id int PRIMARY KEY,setor int); INSERT INTO ${catalogs} VALUES (1,1),(2,2)`);
    await db.$executeRawUnsafe(`CREATE TABLE ${images}(id bigint IDENTITY PRIMARY KEY,catalog_id int NULL,original_name nvarchar(255),stored_name nvarchar(255),storage_path nvarchar(500),mime_type nvarchar(100),size_bytes bigint,width bigint,height bigint,sha256 nchar(64),created_by int,created_at datetime2)`);
    const storage = new CatalogImageStorageService(fixture);
    // Session identities are fixtures; handler authorization and storage use real code.
    Reflect.defineMetadata(GUARDS_METADATA, [{ canActivate(context) { context.switchToHttp().getRequest().user = actor; return true; } }], CatalogController);
    class FixtureModule {}
    Module({ controllers: [CatalogController], providers: [
      { provide: CatalogService, useValue: {} }, { provide: CatalogImageStorageService, useValue: storage },
      { provide: LegacySessionGuard, useValue: { canActivate(context) { context.switchToHttp().getRequest().user = actor; return true; } } },
    ] })(FixtureModule);
    app = await NestFactory.create(FixtureModule, { logger: false, abortOnError: false });
    await app.listen(0, '127.0.0.1');
    const baseUrl = await app.getUrl();
    const response = await upload(baseUrl);
    assert.equal(response.status, 201);
    const saved = await response.json(); assert.ok(saved.id > 0);
    let content = await fetch(baseUrl + '/' + saved.contentPath);
    assert.equal(content.status, 200); assert.equal(content.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(Buffer.from(await content.arrayBuffer()), png);
    const parallel = await Promise.all(Array.from({ length: 6 }, () => upload(baseUrl).then(async r => { assert.equal(r.status, 201); return r.json(); })));
    assert.equal(new Set([saved.id, ...parallel.map(r => r.id)]).size, 7);
    for (const row of parallel) assert.deepEqual((await storage.content(row.id)).data, png);
    actor = { id: 42, grants: [{ permission: 'catalog.ti.read', scope: 'all' }] };
    assert.equal((await upload(baseUrl)).status, 403);
    assert.equal((await fetch(baseUrl + '/' + saved.contentPath)).status, 403, 'Unlinked draft belongs to its uploader');
    await storage.linkContent(1, `<img src="/catalog-images/${saved.id}">`, 41);
    assert.equal((await fetch(baseUrl + '/' + saved.contentPath)).status, 200);
    actor = { id: 43, grants: [{ permission: 'catalog.devops.read', scope: 'all' }] };
    assert.equal((await fetch(baseUrl + '/' + saved.contentPath)).status, 403);
    actor = undefined;
    assert.equal((await fetch(baseUrl + '/' + saved.contentPath)).status, 401);
    actor = { id: 41, grants: [{ permission: 'catalog.ti.create', scope: 'all' }] };
    assert.equal((await upload(baseUrl, Buffer.from('not-an-image'))).status, 400);
    assert.equal((await upload(baseUrl, Buffer.alloc(0))).status, 400);
    const actual = await db.$queryRawUnsafe(`SELECT storage_path FROM ${images} WHERE id=?`, saved.id);
    await fs.writeFile(path.join(temp, actual[0].storage_path), Buffer.from('corrupted test image'));
    assert.equal((await fetch(baseUrl + '/' + saved.contentPath)).status, 404);
    const files = async () => fs.readdir(temp, { recursive: true });
    const before = await files(); failing = true;
    assert.equal((await upload(baseUrl)).status, 500);
    assert.deepEqual(await files(), before, 'Failed metadata insert removes only the newly created file');
    failing = false;
    await db.$executeRawUnsafe(`UPDATE ${images} SET storage_path='../outside.png' WHERE id=?`, saved.id);
    await assert.rejects(storage.content(saved.id), e => e.getStatus() === 404 || e.getStatus() === 400);
    const [count] = await db.$queryRawUnsafe(`SELECT COUNT(*) AS total FROM ${images}`);
    assert.equal(count.total, 7);
  } finally {
    if (app) await app.close();
    Reflect.defineMetadata(GUARDS_METADATA, originalGuards, CatalogController);
    await db.$executeRawUnsafe(`IF OBJECT_ID('tempdb..${images}') IS NOT NULL DROP TABLE ${images}`);
    await db.$executeRawUnsafe(`IF OBJECT_ID('tempdb..${catalogs}') IS NOT NULL DROP TABLE ${catalogs}`);
    await db.$disconnect();
    if (previous === undefined) delete process.env.CATALOG_UPLOAD_DIR; else process.env.CATALOG_UPLOAD_DIR = previous;
    assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await fs.rm(temp, { recursive: true, force: true });
  }
});

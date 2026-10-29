// Read-only inventory. Never requests external URLs or alters metadata/files.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
async function audit(db) {
  const [images, catalogs] = await Promise.all([
    db.$queryRawUnsafe('SELECT id,catalog_id,storage_path,sha256,size_bytes FROM catalog_images'),
    db.$queryRawUnsafe('SELECT id,conteudo FROM catalogos'),
  ]);
  const storage = path.resolve(process.env.CATALOG_UPLOAD_DIR || path.join(root, 'storage/uploads/catalog'));
  const report = { checkedAt: new Date().toISOString(), catalogs: catalogs.length, registered: images.length,
    validFiles: 0, validBytes: 0, missingFiles: [], corruptFiles: [], invalidPaths: [],
    references: { total: 0, managed: 0, embedded: 0, external: 0, externalUnique: 0, relative: 0, withoutMetadata: [], unresolvedRelative: [] },
  };
  const byId = new Map(images.map(row => [Number(row.id), row]));
  const external = new Set();
  for (const image of images) {
    const item = { imageId: Number(image.id), catalogId: image.catalog_id };
    const file = path.resolve(storage, image.storage_path);
    if (!file.startsWith(storage + path.sep)) { report.invalidPaths.push(item); continue; }
    let data;
    try { data = await fs.readFile(file); } catch { report.missingFiles.push(item); continue; }
    if (data.length !== Number(image.size_bytes) || createHash('sha256').update(data).digest('hex') !== image.sha256.trim()) {
      report.corruptFiles.push(item); continue;
    }
    report.validFiles++; report.validBytes += data.length;
  }
  for (const catalog of catalogs) {
    for (const match of String(catalog.conteudo || '').matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
      const src = match[1]; report.references.total++;
      const managed = src.match(/^(?:\/catalog-images\/(\d+)|(?:\/api\/)?catalog\/images\/(\d+)\/content)$/i);
      if (managed) {
        const imageId = Number(managed[1] || managed[2]); report.references.managed++;
        if (!byId.has(imageId)) report.references.withoutMetadata.push({ catalogId: catalog.id, imageId });
      } else if (/^data:image\//i.test(src)) report.references.embedded++;
      else if (/^https?:\/\//i.test(src)) { report.references.external++; external.add(src); }
      else {
        report.references.relative++;
        report.references.unresolvedRelative.push({ catalogId: catalog.id, fingerprint: createHash('sha256').update(src).digest('hex') });
      }
    }
  }
  report.references.externalUnique = external.size;
  return report;
}
module.exports = { audit };
if (require.main === module) {
  process.loadEnvFile(path.join(root, '.env'));
  const { createNivel3Client } = require('../packages/database/dist');
  const db = createNivel3Client();
  audit(db).then(async report => {
    await fs.mkdir(path.join(root, '.tmp'), { recursive: true });
    await fs.writeFile(path.join(root, '.tmp/catalog-images-audit.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  }).catch(() => { console.error('Não foi possível concluir a auditoria de imagens. Nenhum arquivo ou registro foi alterado.'); process.exitCode = 1; })
    .finally(() => db.$disconnect());
}

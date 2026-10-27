// Read-only SQL/filesystem audit. Writes only aggregate reports under docs/reports.
const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
process.loadEnvFile(path.join(root, '.env'));
const { createNivel3Client } = require('../packages/database/dist');
const db = createNivel3Client();
const quote = value => '[' + value.replaceAll(']', ']]') + ']';
const extensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tif', '.tiff', '.svg', '.ico', '.avif', '.heic', '.heif']);
const report = { startedAt: new Date().toISOString(), database: null, binaryColumns: [], embeddedImages: [], htmlImageReferences: [], fileAreas: [], references: [], warnings: [] };
const contents = new Map();
function register(hash, bytes, location) {
  const item = contents.get(hash) ?? { bytes, copies: 0, locations: new Set() };
  item.copies++;
  item.locations.add(location);
  contents.set(hash, item);
}
function imageType(data) {
  const hex = data.toString('hex').toUpperCase();
  if (hex.startsWith('FFD8FF')) return 'jpeg';
  if (hex.startsWith('89504E470D0A1A0A')) return 'png';
  if (hex.startsWith('474946383761') || hex.startsWith('474946383961')) return 'gif';
  if (data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (hex.startsWith('424D')) return 'bmp';
  if (hex.startsWith('49492A00') || hex.startsWith('4D4D002A')) return 'tiff';
  if (hex.startsWith('00000100')) return 'ico';
  if (/^\s*(?:<\?xml[^>]*>\s*)?<svg\b/i.test(data.toString('utf8'))) return 'svg';
  if (data.subarray(4, 8).toString() === 'ftyp' && /avif|avis|heic|heif|mif1/.test(data.subarray(8).toString())) return 'avif/heif';
  return null;
}

async function databaseImages() {
  const [info] = await db.$queryRawUnsafe('SELECT DB_NAME() AS name');
  report.database = info.name;
  const columns = await db.$queryRawUnsafe(`SELECT s.name AS schema_name, t.name AS table_name, c.name AS column_name, ty.name AS type
    FROM sys.columns c JOIN sys.tables t ON t.object_id=c.object_id
    JOIN sys.schemas s ON s.schema_id=t.schema_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id
    WHERE ty.name IN ('image','binary','varbinary','varchar','nvarchar','text','ntext','char','nchar')`);
  for (const col of columns.filter(c => ['image','binary','varbinary'].includes(c.type))) {
    const label = `${col.schema_name}.${col.table_name}.${col.column_name}`;
    const table = `${quote(col.schema_name)}.${quote(col.table_name)}`;
    const field = quote(col.column_name);
    const [stats] = await db.$queryRawUnsafe(`SELECT COUNT_BIG(*) AS rows, COUNT_BIG(CASE WHEN DATALENGTH(${field})>0 THEN 1 END) AS nonempty,
      COALESCE(SUM(CONVERT(bigint,DATALENGTH(${field}))),0) AS bytes FROM ${table}`);
    const row = { source: label, rows: Number(stats.rows), nonempty: Number(stats.nonempty), allAttachmentBytes: Number(stats.bytes), count: 0, bytes: 0, formats: {}, otherAttachments: { count: 0, bytes: 0, formats: {} } };
    const hashes = await db.$queryRawUnsafe(`SELECT DATALENGTH(${field}) AS bytes, CONVERT(varchar(64),HASHBYTES('SHA2_256',CONVERT(varbinary(max),${field})),2) AS hash,
      CONVERT(varchar(128),SUBSTRING(${field},1,64),2) AS header FROM ${table} WHERE DATALENGTH(${field})>0`);
    for (const item of hashes) {
      const type = imageType(Buffer.from(item.header, 'hex')) ?? 'unrecognized';
      if (type === 'unrecognized') {
        const header = Buffer.from(item.header, 'hex');
        const other = header.subarray(0,4).toString() === '%PDF' ? 'pdf' : header.subarray(4,8).toString() === 'ftyp' ? 'video/mp4-container' : header.subarray(0,2).toString() === 'PK' ? 'zip/office-container' : /^\s*<!doctype html/i.test(header.toString()) ? 'html' : 'unknown';
        row.otherAttachments.count++;
        row.otherAttachments.bytes += Number(item.bytes);
        row.otherAttachments.formats[other] = (row.otherAttachments.formats[other] ?? 0) + 1;
        continue;
      }
      row.count++;
      row.bytes += Number(item.bytes);
      row.formats[type] = (row.formats[type] ?? 0) + 1;
      register(item.hash.toLowerCase(), Number(item.bytes), 'database-binary');
    }
    report.binaryColumns.push(row);
  }
  const tables = new Map();
  for (const col of columns.filter(c => !['image','binary','varbinary'].includes(c.type))) {
    const key = `${col.schema_name}.${col.table_name}`;
    if (!tables.has(key)) tables.set(key, []);
    tables.get(key).push(col);
  }
  report.scannedTextColumns = [...tables.values()].reduce((sum, cols) => sum + cols.length, 0);
  let scanned = 0;
  for (const [label, cols] of tables) {
    const table = `${quote(cols[0].schema_name)}.${quote(cols[0].table_name)}`;
    const expressions = cols.map(col => `CONVERT(nvarchar(max),${quote(col.column_name)})`);
    const rows = await db.$queryRawUnsafe(`SELECT ${expressions.map((expr, i) => `${expr} AS c${i}`).join(',')}
      FROM ${table} WHERE ${expressions.map(expr => `(${expr} LIKE '%data:image/%' OR ${expr} LIKE '%data:image\\/%' OR ${expr} LIKE '%<img%')`).join(' OR ')}`);
    cols.forEach((col, index) => {
      const stats = { source: `${label}.${col.column_name}`, rows: 0, count: 0, decodedBytes: 0, storedDataUriBytes: 0, formats: {}, nonBase64: 0 };
      const html = { source: stats.source, total: 0, dataUri: 0, applicationCatalog: 0, remoteHttp: 0, otherLocal: 0, distinctRemoteTargets: 0, remoteOrigins: {} };
      const remoteTargets = new Set();
      for (const row of rows) {
        const original = row['c' + index];
        if (typeof original !== 'string') continue;
        const text = original.replace(/\\\//g, '/');
        for (const tag of text.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']*)["']/gi)) {
          html.total++;
          if (/^data:image\//i.test(tag[1])) html.dataUri++;
          else if (/(?:catalog\/images\/\d+\/content|catalog-images\/\d+)/i.test(tag[1])) html.applicationCatalog++;
          else if (/^(?:https?:)?\/\//i.test(tag[1])) {
            html.remoteHttp++;
            remoteTargets.add(tag[1]);
            try {
              const origin = new URL(tag[1].startsWith('//') ? 'https:' + tag[1] : tag[1]).origin;
              html.remoteOrigins[origin] = (html.remoteOrigins[origin] ?? 0) + 1;
            } catch { /* Count malformed URLs without exporting their contents. */ }
          }
          else html.otherLocal++;
        }
        const matches = [...text.matchAll(/data:image\/([a-z0-9.+-]+)(?:;[^,;"'<>]*)*;base64,([a-z0-9+/=\r\n\t ]+)/gi)];
        const nonBase64 = Math.max(0, (text.match(/data:image\//gi) ?? []).length - matches.length);
        if (matches.length || nonBase64) stats.rows++;
        stats.nonBase64 += nonBase64;
        for (const match of matches) {
          const data = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
          stats.count++;
          stats.decodedBytes += data.length;
          // DATALENGTH of the data URI itself; excludes surrounding HTML/JSON and row/index overhead.
          stats.storedDataUriBytes += match[0].length * (['nvarchar','nchar','ntext'].includes(col.type) ? 2 : 1);
          stats.formats[match[1]] = (stats.formats[match[1]] ?? 0) + 1;
          register(createHash('sha256').update(data).digest('hex'), data.length, 'database-base64');
        }
      }
      if (stats.count || stats.nonBase64) report.embeddedImages.push(stats);
      if (html.total) { html.distinctRemoteTargets = remoteTargets.size; report.htmlImageReferences.push(html); }
    });
    scanned++;
    if (scanned % 20 === 0) console.log(`Scanned text tables: ${scanned}/${tables.size}`);
  }
}

const roots = [
  ['catalog', process.env.CATALOG_UPLOAD_DIR || path.join(root,'storage/uploads/catalog')],
  ['tickets', process.env.TICKET_UPLOAD_DIR || path.join(root,'storage/uploads/tickets')],
  ['expenses', process.env.RD_UPLOAD_DIR || path.join(root,'storage/uploads/rd')],
  ['legacy-tickets', path.join(root,'uploads')],
  ['legacy-expenses', path.join(root,'uploads_rd')],
];
const imagesOnDisk = new Map();
const visited = new Set();
async function walk(directory, area, business = true) {
  const stats = { area, directory: path.resolve(directory), business, exists: true, files: 0, count: 0, bytes: 0, formats: {}, extensionOnly: 0 };
  report.fileAreas.push(stats);
  async function visit(folder) {
    let entries;
    try { entries = await fs.readdir(folder, { withFileTypes: true }); } catch (error) {
      if (folder === stats.directory && error.code === 'ENOENT') { stats.exists = false; return; }
      report.warnings.push({ area, operation: 'readdir', code: error.code }); return;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) { report.warnings.push({ area, operation: 'skipped-symlink' }); continue; }
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) { await visit(full); continue; }
      if (!entry.isFile() || visited.has(full.toLowerCase())) continue;
      visited.add(full.toLowerCase());
      stats.files++;
      try {
        const info = await fs.lstat(full);
        const handle = await fs.open(full, 'r');
        const header = Buffer.alloc(512);
        let bytesRead;
        try { ({ bytesRead } = await handle.read(header, 0, header.length, 0)); } finally { await handle.close(); }
        const type = imageType(header.subarray(0, bytesRead));
        const byExtension = extensions.has(path.extname(entry.name).toLowerCase());
        if (!type && !byExtension) continue;
        const detected = type ?? path.extname(entry.name).slice(1).toLowerCase();
        stats.count++;
        stats.bytes += info.size;
        stats.formats[detected] = (stats.formats[detected] ?? 0) + 1;
        if (!type) stats.extensionOnly++;
        const hash = createHash('sha256');
        for await (const chunk of createReadStream(full)) hash.update(chunk);
        const sha256 = hash.digest('hex');
        imagesOnDisk.set(full.toLowerCase(), { bytes: info.size, sha256, area });
        if (business) register(sha256, info.size, 'files');
      } catch (error) { report.warnings.push({ area, operation: 'read-file', code: error.code }); }
    }
  }
  await visit(stats.directory);
}

async function references() {
  const catalogRoot = path.resolve(roots[0][1]);
  const catalog = await db.$queryRawUnsafe('SELECT id, storage_path, size_bytes, sha256 FROM dbo.catalog_images');
  const stats = { source: 'catalog_images', count: catalog.length, declaredBytes: 0, present: 0, missing: 0, missingIds: [], sizeMismatch: 0, hashMismatch: 0, distinctPhysicalFiles: 0 };
  const linked = new Set();
  for (const row of catalog) {
    stats.declaredBytes += Number(row.size_bytes);
    const full = path.resolve(catalogRoot, row.storage_path.replace(/\\/g, '/')).toLowerCase();
    const found = imagesOnDisk.get(full);
    if (!found) { stats.missing++; stats.missingIds.push(Number(row.id)); continue; }
    linked.add(full);
    stats.present++;
    if (found.bytes !== Number(row.size_bytes)) stats.sizeMismatch++;
    if (found.sha256 !== row.sha256.trim().toLowerCase()) stats.hashMismatch++;
  }
  stats.distinctPhysicalFiles = linked.size;
  stats.filesWithoutCatalogMetadata = [...imagesOnDisk.entries()].filter(([file, item]) => item.area === 'catalog' && !linked.has(file)).length;
  report.references.push(stats);
  const documents = await db.$queryRawUnsafe(`SELECT caminho_arquivo,nome_arquivo,tipo_arquivo FROM dbo.documentos WHERE tipo_arquivo LIKE 'image/%'
    OR LOWER(nome_arquivo) LIKE '%.jpg' OR LOWER(nome_arquivo) LIKE '%.jpeg' OR LOWER(nome_arquivo) LIKE '%.png'
    OR LOWER(nome_arquivo) LIKE '%.gif' OR LOWER(nome_arquivo) LIKE '%.webp' OR LOWER(nome_arquivo) LIKE '%.svg'`);
  const documentStats = { source: 'documentos: image MIME/extension', count: documents.length, present: 0, missingLocal: 0, remote: 0, distinctReferences: 0, observedBytes: 0 };
  const documentReferences = new Set();
  for (const item of documents) {
    const stored = String(item.caminho_arquivo || '');
    documentReferences.add(stored);
    const normalized = stored.replace(/\\/g,'/').replace(/^(\.\.\/)+/, '').replace(/^\/+/, '');
    const relative = normalized.startsWith('uploads/') ? normalized.slice('uploads/'.length) : normalized;
    const candidates = [roots[1][1], roots[3][1]].map(directory => path.resolve(directory,relative).toLowerCase());
    const found = candidates.map(file => imagesOnDisk.get(file)).find(Boolean);
    if (found) { documentStats.present++; documentStats.observedBytes += found.bytes; }
    else if (/^https?:\/\//i.test(stored)) documentStats.remote++;
    else documentStats.missingLocal++;
  }
  documentStats.distinctReferences = documentReferences.size;
  report.references.push(documentStats);
  const [trade] = await db.$queryRawUnsafe("SELECT COUNT_BIG(*) AS count, COALESCE(SUM(CONVERT(bigint,tamanho_bytes)),0) AS declaredBytes FROM dbo.troca_devolucao_anexos WHERE mime_type LIKE 'image/%'");
  report.references.push({ source: 'troca_devolucao_anexos: image MIME', count: Number(trade.count), declaredBytes: Number(trade.declaredBytes) });
  const [photos] = await db.$queryRawUnsafe('SELECT COUNT_BIG(*) AS count FROM dbo.cads_fotos WHERE endereco IS NOT NULL AND LEN(endereco)>0');
  report.references.push({ source: 'cads_fotos: addresses (not binary content)', count: Number(photos.count) });
  const jsonColumns = await db.$queryRawUnsafe(`SELECT s.name AS schema_name,t.name AS table_name,c.name AS column_name
    FROM sys.columns c JOIN sys.tables t ON t.object_id=c.object_id JOIN sys.schemas s ON s.schema_id=t.schema_id
    WHERE c.name='anexos'`);
  for (const column of jsonColumns) {
    const table = `${quote(column.schema_name)}.${quote(column.table_name)}`;
    const field = quote(column.column_name);
    const rows = await db.$queryRawUnsafe(`SELECT CONVERT(nvarchar(max),${field}) AS value FROM ${table} WHERE ${field} IS NOT NULL AND DATALENGTH(${field})>0`);
    const stats = { source: `${column.schema_name}.${column.table_name}.${column.column_name}: JSON references`, rows: rows.length, attachments: 0, identifiableImages: 0, otherKnownTypes: 0, unknownType: 0, imageFilesFound: 0, remoteImageReferences: 0, unresolvedImageReferences: 0, invalidJsonRows: 0 };
    for (const row of rows) {
      let parsed;
      try { parsed = JSON.parse(row.value); } catch { stats.invalidJsonRows++; continue; }
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length) {
        const item = queue.shift();
        if (typeof item === 'string') { stats.attachments++; stats.unknownType++; continue; }
        if (!item || typeof item !== 'object') continue;
        if (Array.isArray(item)) { queue.push(...item); continue; }
        const reference = item.storagePath || item.url || item.caminho_local || item.path;
        const name = item.nome || item.fileName || item.name || reference || '';
        const mime = item.mimeType || item.mime_type || item.type || '';
        if (!reference && !name && !mime) { queue.push(...Object.values(item)); continue; }
        stats.attachments++;
        const ext = path.extname(String(name).split('?')[0]).toLowerCase();
        if (!String(mime).startsWith('image/') && !extensions.has(ext)) {
          if (mime || ['.pdf','.doc','.docx','.xls','.xlsx','.zip','.mp4'].includes(ext)) stats.otherKnownTypes++;
          else stats.unknownType++;
          continue;
        }
        stats.identifiableImages++;
        const relative = String(reference || name).replace(/\\/g,'/').replace(/^.*\/uploads_rd\//i,'').replace(/^\/+/, '');
        const candidates = [roots[2][1], roots[4][1]].map(directory => path.resolve(directory,relative).toLowerCase());
        if (candidates.some(file => imagesOnDisk.has(file))) stats.imageFilesFound++;
        else if (/^https?:\/\//i.test(String(reference))) stats.remoteImageReferences++;
        else stats.unresolvedImageReferences++;
      }
    }
    report.references.push(stats);
  }
}

async function main() {
  await databaseImages();
  for (const [area, directory] of roots) await walk(directory, area);
  await walk(path.join(root,'apps/web/public'), 'interface-assets', false);
  // Root favicon is a separate physical copy, outside the public directory.
  try {
    const info = await fs.lstat(path.join(root,'favicon.ico'));
    report.fileAreas.push({ area: 'root-favicon', business: false, count: 1, bytes: info.size, exists: true });
  } catch (error) { if (error.code !== 'ENOENT') report.warnings.push({ area: 'root-favicon', code: error.code }); }
  await references();
  const binaryBytes = report.binaryColumns.reduce((sum, row) => sum + row.bytes, 0);
  const binaryCount = report.binaryColumns.reduce((sum, row) => sum + row.count, 0);
  const embeddedCount = report.embeddedImages.reduce((sum, row) => sum + row.count, 0);
  const embeddedDecodedBytes = report.embeddedImages.reduce((sum, row) => sum + row.decodedBytes, 0);
  const embeddedStoredBytes = report.embeddedImages.reduce((sum, row) => sum + row.storedDataUriBytes, 0);
  const files = report.fileAreas.filter(area => area.business);
  const filesCount = files.reduce((sum, row) => sum + row.count, 0);
  const filesBytes = files.reduce((sum, row) => sum + row.bytes, 0);
  report.totals = { binaryCount, binaryBytes, embeddedCount, embeddedDecodedBytes, embeddedStoredBytes, filesCount, filesBytes,
    businessImageOccurrences: binaryCount + embeddedCount + filesCount,
    businessImagePayloadBytes: binaryBytes + embeddedDecodedBytes + filesBytes,
    businessImageStoredBytes: binaryBytes + embeddedStoredBytes + filesBytes,
    uniqueBusinessImages: contents.size,
    uniqueBusinessPayloadBytes: [...contents.values()].reduce((sum, item) => sum + item.bytes, 0),
    repeatedContentCopies: [...contents.values()].reduce((sum, item) => sum + item.copies - 1, 0),
    uniqueContentInBothDatabaseAndFiles: [...contents.values()].filter(item => item.locations.has('files') && (item.locations.has('database-binary') || item.locations.has('database-base64'))).length,
    interfaceCount: report.fileAreas.filter(area => !area.business).reduce((sum, row) => sum + row.count, 0),
    interfaceBytes: report.fileAreas.filter(area => !area.business).reduce((sum, row) => sum + row.bytes, 0),
    nonImageBinaryAttachments: report.binaryColumns.reduce((sum, row) => sum + row.otherAttachments.count, 0),
    nonImageBinaryAttachmentBytes: report.binaryColumns.reduce((sum, row) => sum + row.otherAttachments.bytes, 0),
  };
  report.completedAt = new Date().toISOString();
  report.scope = 'Connected database and configured upload roots plus their legacy fallbacks; interface assets counted separately. Excludes backup archives, dependencies, build copies, remote URLs and other databases. Byte totals are logical payload sizes, not SQL page/index allocation or disk cluster usage. Counts are occurrences; SHA-256 unique content also reported. Text scan covers data:image inline encodings, not arbitrary unmarked Base64.';
  await fs.mkdir(path.join(root,'docs/reports'), { recursive: true });
  const output = path.join(root,'docs/reports/image-inventory-' + report.startedAt.slice(0,10) + '.json');
  await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  console.log('Report:', output);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());

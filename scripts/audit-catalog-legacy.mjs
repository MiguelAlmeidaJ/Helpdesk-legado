import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const self = 'scripts/audit-catalog-legacy.mjs';
const documentation = 'docs/CATALOG-MIGRATION.md';
const centralAudit = 'scripts/audit-legacy-php.mjs';
const strict = process.argv.includes('--strict');

const runtimeExtensions = new Set([
  '.php',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.html',
  '.htm',
]);

const legacyCatalogEntryPoints = [
  'catlg/catalogo.php',
  'catlg/catalogo_editar.php',
  'catlg/catalogo_visualizar.php',
  'catlg/check_catlg.php',
  'catlg/localizar_catalogo.php',
];

const tracked = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard'],
  {
    cwd: root,
    encoding: 'utf8',
  },
)
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter(Boolean)
  .filter((file, index, all) => all.indexOf(file) === index)
  .filter((file) => existsSync(path.join(root, file)));

const remainingLegacyFiles = tracked.filter((file) => file.startsWith('catlg/'));

const runtimeFiles = tracked.filter(
  (file) =>
    file !== self &&
    file !== documentation &&
    file !== centralAudit &&
    !file.startsWith('catlg/') &&
    runtimeExtensions.has(path.extname(file).toLowerCase()),
);

function normalizedTarget(value) {
  const normalized = path.posix
    .normalize(value.replaceAll('\\', '/'))
    .replace(/^(\.\/)+/, '')
    .replace(/^\/+/, '');

  return normalized === '.' ? '' : normalized;
}

function withoutComments(content) {
  return content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function extractPhpPathLiterals(content) {
  const matcher =
    /(?:\.\.\/|\.\/|\/)*[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.php(?:[?#][^"'`\s<>()]*)?/gi;
  const values = [];
  let match;

  while ((match = matcher.exec(withoutComments(content))) !== null) {
    values.push(match[0]);
  }

  return [...new Set(values)];
}

function resolveReference(sourceFile, literal) {
  const clean = literal.replaceAll('\\', '/').split(/[?#]/, 1)[0];

  if (!clean) return '';

  const catalogIndex = clean.toLowerCase().indexOf('catlg/');
  if (catalogIndex >= 0) {
    return normalizedTarget(clean.slice(catalogIndex));
  }

  if (clean.startsWith('/')) {
    return normalizedTarget(clean);
  }

  return normalizedTarget(
    path.posix.join(path.posix.dirname(sourceFile), clean),
  );
}

const targets = new Set(legacyCatalogEntryPoints.map(normalizedTarget));
const references = [];

for (const file of runtimeFiles) {
  let content = '';

  try {
    content = readFileSync(path.join(root, file), 'utf8');
  } catch {
    continue;
  }

  for (const literal of extractPhpPathLiterals(content)) {
    const resolved = resolveReference(file, literal);

    if (targets.has(resolved)) {
      references.push({ file, literal, resolved });
    }
  }
}

console.log('Auditoria do catálogo legado');
console.log(`  modo: ${strict ? 'strict' : 'inventory'}`);
console.log(`  endpoints conhecidos: ${legacyCatalogEntryPoints.length}`);
console.log(`  arquivos atuais em catlg/: ${remainingLegacyFiles.length}`);
console.log(`  runtimes externos verificados: ${runtimeFiles.length}`);
console.log(`  referências externas encontradas: ${references.length}`);

if (remainingLegacyFiles.length > 0) {
  console.log('\nArquivos do catálogo legado ainda presentes:');
  for (const file of remainingLegacyFiles) {
    console.log(`  ${file}`);
  }
}

if (references.length > 0) {
  console.log('\nDependências externas a migrar:');
  for (const reference of references) {
    console.log(
      `  ${reference.file}  [${reference.literal}] -> ${reference.resolved}`,
    );
  }
}

if (strict && (remainingLegacyFiles.length > 0 || references.length > 0)) {
  console.error(
    `\nFalha: o catálogo ainda possui ${remainingLegacyFiles.length} arquivo(s) legado(s) e ${references.length} referência(s) externa(s).`,
  );
  process.exitCode = 2;
} else if (strict) {
  console.log(
    '\nOK: catlg/ está removido e nenhum runtime aponta para os endpoints PHP aposentados.',
  );
} else {
  console.log(
    '\nInventário concluído: use as referências acima como checklist de migração. O modo inventory não bloqueia enquanto catlg/ ainda é a implementação vigente.',
  );
}

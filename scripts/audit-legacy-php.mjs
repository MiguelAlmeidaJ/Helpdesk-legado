import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const self = 'scripts/audit-legacy-php.mjs';
const runtimeExtensions = new Set([
  '.php',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.html',
  '.htm',
]);

const compatibilityBridges = [
  'atd/home.php',
  'atd/atd.php',
  'atd/atd_detalhe.php',
];

const removedRuntimePaths = [
  'atd/add_arquivos.php',
  'atd/add_image.php',
  'atd/busca_img_docs.php',
  'atd/delete_document.php',
  'atd/delete_image.php',
  'user/home.php',
  'user/edt_user.php',
  'reset_senha.php',
  'enviar_email_recuperacao.php',
];

const retirementCandidates = [
  'atd/busca_itens.php',
  'atd/busca_locais.php',
  'atd/busca_solicitantes.php',
  'atd/busca_subcategorias.php',
  'atd/recorrente.php',
  'atd/recorrente_data.php',
  'atd/srhome.php',
  'atd/timeline.php',
  'atd/disponibilidade/index.php',
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

const runtimeFiles = tracked.filter(
  (file) =>
    file !== self &&
    runtimeExtensions.has(path.extname(file).toLowerCase()),
);

function normalizedTarget(value) {
  const normalized = path.posix
    .normalize(value.replaceAll('\\', '/'))
    .replace(/^(\.\/)+/, '')
    .replace(/^\/+/, '');

  return normalized === '.' ? '' : normalized;
}

function extractPhpPathLiterals(content) {
  const withoutBlockComments = content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const matcher =
    /(?:\.\.\/|\.\/|\/)*[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.php(?:[?#][^"'`\s<>()]*)?/gi;
  const values = [];
  let match;

  while ((match = matcher.exec(withoutBlockComments)) !== null) {
    values.push(match[0]);
  }

  return [...new Set(values)];
}

function resolveReference(sourceFile, literal) {
  const clean = literal
    .replaceAll('\\', '/')
    .split(/[?#]/, 1)[0];

  if (!clean) return '';

  if (clean.startsWith('/')) {
    return normalizedTarget(clean);
  }

  return normalizedTarget(
    path.posix.join(path.posix.dirname(sourceFile), clean),
  );
}

function references(target, excluded = new Set()) {
  const normalized = normalizedTarget(target);
  const results = [];

  for (const file of runtimeFiles) {
    if (excluded.has(file)) continue;

    let content = '';
    try {
      content = readFileSync(path.join(root, file), 'utf8');
    } catch {
      continue;
    }

    for (const literal of extractPhpPathLiterals(content)) {
      if (resolveReference(file, literal) === normalized) {
        results.push({ file, literal });
      }
    }
  }

  return results;
}

function printReferences(refs) {
  for (const ref of refs) {
    console.log(`          <- ${ref.file}  [${ref.literal}]`);
  }
}

const phpFiles = tracked.filter((file) => file.endsWith('.php'));
const byRoot = new Map();

for (const file of phpFiles) {
  const rootDir = file.includes('/') ? file.split('/')[0] : '.';
  byRoot.set(rootDir, (byRoot.get(rootDir) ?? 0) + 1);
}

console.log(`PHP rastreados: ${phpFiles.length}`);
for (const [dir, count] of [...byRoot.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${dir}`);
}

console.log('\nBridges de compatibilidade para o Next:');
let missingBridges = 0;

for (const target of compatibilityBridges) {
  if (!tracked.includes(target)) {
    missingBridges += 1;
    console.log(`  MISSING ${target}`);
    continue;
  }

  const refs = references(target, new Set([target]));
  console.log(`  BRIDGE  ${target} (${refs.length} consumidor(es))`);
  printReferences(refs);
}

console.log('\nReferências para endpoints PHP já removidos:');
let dangling = 0;

for (const target of removedRuntimePaths) {
  const refs = references(target);
  if (refs.length === 0) {
    console.log(`  OK      ${target}`);
    continue;
  }

  dangling += refs.length;
  console.log(`  DANGLE  ${target}`);
  printReferences(refs);
}

console.log('\nCandidatos de aposentadoria em atd/:');
for (const target of retirementCandidates) {
  if (!tracked.includes(target)) {
    console.log(`  REMOVED ${target}`);
    continue;
  }

  const refs = references(target, new Set([target]));
  if (refs.length === 0) {
    console.log(`  ORPHAN  ${target}`);
  } else {
    console.log(`  KEEP    ${target}`);
    printReferences(refs);
  }
}

if (missingBridges > 0 || dangling > 0) {
  console.error(
    `\nFalha: ${missingBridges} bridge(s) ausente(s) e ${dangling} referência(s) canônica(s) apontando para PHP removido.`,
  );
  process.exitCode = 2;
} else {
  console.log(
    '\nOK: bridges presentes e nenhum runtime rastreado aponta para endpoints PHP removidos.',
  );
}

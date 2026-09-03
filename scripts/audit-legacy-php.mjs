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

const removedRuntimePaths = [
  'atd/home.php',
  'atd/atd.php',
  'atd/atd_detalhe.php',
  'atd/add_arquivos.php',
  'atd/add_image.php',
  'atd/busca_img_docs.php',
  'atd/delete_document.php',
  'atd/delete_image.php',
  'atd/busca_locais.php',
  'atd/disponibilidadeTec.php',
  'atd/disponibilidade/index.php',
  'atd/disponibilidade/relatorio_espera_pdf.php',
  'atd/relatorio_espera_pdf.php',
  'atd/srhome.php',
  'atd/timeline.php',
  'user/home.php',
  'user/edt_user.php',
  'reset_senha.php',
  'enviar_email_recuperacao.php',
  'home/partials/dashboard/bootstrap.php',
  'home/partials/dashboard/content.php',
  'home/partials/dashboard/head.php',
  'home/partials/dashboard/rankings/data/devops-quarterly.php',
  'home/partials/dashboard/rankings/data/mkt-quarterly.php',
  'home/partials/dashboard/rankings/data/period.php',
  'home/partials/dashboard/rankings/data/qa-quarterly.php',
  'home/partials/dashboard/rankings/data/ti-quarterly.php',
  'home/partials/dashboard/rankings/views/monthly/devops.php',
  'home/partials/dashboard/rankings/views/monthly/mkt.php',
  'home/partials/dashboard/rankings/views/monthly/qa.php',
  'home/partials/dashboard/rankings/views/monthly/ti.php',
  'home/partials/dashboard/rankings/views/quarterly/devops.php',
  'home/partials/dashboard/rankings/views/quarterly/mkt.php',
  'home/partials/dashboard/rankings/views/quarterly/qa.php',
  'home/partials/dashboard/rankings/views/quarterly/ti.php',
  'home/partials/dashboard/rankings/views/summary.php',
  'home/partials/dashboard/scripts.php',
  'logistica/addDespesa.php',
  'logistica/editarRD.php',
  'logistica/excluirRD.php',
  'logistica/recebe_upload.php',
];

const retiredDirectories = [
  { label: 'atd/', prefix: 'atd/' },
  { label: 'home/', prefix: 'home/' },
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

const retiredDirectoryState = retiredDirectories.map((directory) => ({
  ...directory,
  files: tracked.filter((file) => file.startsWith(directory.prefix)),
}));

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

console.log('\nDiretórios legados aposentados:');
let remainingRetiredFiles = 0;

for (const directory of retiredDirectoryState) {
  remainingRetiredFiles += directory.files.length;

  if (directory.files.length === 0) {
    console.log(`  REMOVED ${directory.label} (0 arquivos)`);
    continue;
  }

  console.log(
    `  KEEP    ${directory.label} (${directory.files.length} arquivo(s))`,
  );
  for (const file of directory.files) {
    console.log(`          <- ${file}`);
  }
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

if (remainingRetiredFiles > 0 || dangling > 0) {
  console.error(
    `\nFalha: ${remainingRetiredFiles} arquivo(s) ainda restam em diretórios aposentados e ${dangling} referência(s) canônica(s) apontam para PHP removido.`,
  );
  process.exitCode = 2;
} else {
  console.log(
    '\nOK: diretórios aposentados vazios e nenhum runtime rastreado aponta para endpoints PHP removidos.',
  );
}

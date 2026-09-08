import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const self = 'scripts/audit-legacy-all.mjs';
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

const allFiles = [
  'app_url.php',
  'conect.php',
  'email_smtp.php',
  'loading.php',
  'loading_home.php',
  'native_api_session.php',
  'permissoes.php',
  'seguranca.php',
  'session.php',
  'sidebar.php',
  'token.php',
  'update_pass.php',
  'update_senha.php',
  'update_senha_antiga.php',
];

const tracked = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard'],
  { cwd: root, encoding: 'utf8' },
)
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter(Boolean)
  .filter((file, index, files) => files.indexOf(file) === index)
  .filter((file) => existsSync(path.join(root, file)));

const runtimeFiles = tracked.filter(
  (file) =>
    file !== self &&
    !file.startsWith('all/') &&
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
  const withoutComments = content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const matcher =
    /(?:\.\.\/|\.\/|\/)*[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.php(?:[?#][^"'`\s<>()]*)?/gi;
  const values = [];
  let match;

  while ((match = matcher.exec(withoutComments)) !== null) {
    values.push(match[0]);
  }

  return [...new Set(values)];
}

function resolveReference(sourceFile, literal) {
  const clean = literal.replaceAll('\\', '/').split(/[?#]/, 1)[0];
  if (!clean) return '';
  if (clean.startsWith('/')) return normalizedTarget(clean);

  return normalizedTarget(
    path.posix.join(path.posix.dirname(sourceFile), clean),
  );
}

const targetSet = new Set(allFiles.map((file) => `all/${file}`));
const references = [];

for (const file of runtimeFiles) {
  let content = '';
  try {
    content = readFileSync(path.join(root, file), 'utf8');
  } catch {
    continue;
  }

  for (const literal of extractPhpPathLiterals(content)) {
    const target = resolveReference(file, literal);
    if (targetSet.has(target)) {
      references.push({ file, literal, target });
    }
  }
}

const allDirectoryExists = existsSync(path.join(root, 'all'));
const bridgeCoverage = allFiles.map((file) => ({
  file,
  bridgeExists: existsSync(path.join(root, 'legacy', 'bridge', file)),
}));

console.log('Retirement guard: all/ -> legacy/bridge/');
console.log(`  all/: ${allDirectoryExists ? 'PRESENT' : 'REMOVED'}`);
for (const item of bridgeCoverage) {
  console.log(
    `  ${item.bridgeExists ? 'BRIDGE ' : 'MISSING'}  ${item.file}`,
  );
}

console.log('\nReferências runtime para all/:');
if (references.length === 0) {
  console.log('  OK: nenhuma referência executável encontrada.');
} else {
  for (const ref of references) {
    console.log(`  ${ref.target} <- ${ref.file}  [${ref.literal}]`);
  }
}

const missingBridge = bridgeCoverage.filter((item) => !item.bridgeExists);
console.log(
  `\nResumo: all/ ${allDirectoryExists ? 'presente' : 'removido'}, ${references.length} referência(s) externa(s), ${missingBridge.length} implementação(ões) ausente(s) em legacy/bridge/.`,
);

const invalid =
  allDirectoryExists || references.length > 0 || missingBridge.length > 0;

if (strict && invalid) {
  console.error(
    '\nFalha: o retirement guard de all/ não está satisfeito.',
  );
  process.exitCode = 2;
} else if (!invalid) {
  console.log(
    '\nOK: all/ está aposentado; nenhuma referência runtime aponta para ele e a cobertura canônica do bridge está completa.',
  );
} else {
  console.log(
    '\nINFO: use --strict para transformar este inventário em gate de CI.',
  );
}

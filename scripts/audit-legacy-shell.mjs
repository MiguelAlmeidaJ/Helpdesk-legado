import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const self = 'scripts/audit-legacy-shell.mjs';

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

const shellTargets = [
  {
    path: 'home.php',
    role: 'bridge',
    description: 'bridge do dashboard legado para /dashboard',
  },
  {
    path: 'index.php',
    role: 'bridge',
    description: 'bridge da raiz PHP para /login',
  },
  {
    path: 'logout.php',
    role: 'bridge',
    description: 'revoga sessão nativa a partir de páginas PHP',
  },
  {
    path: 'all/sidebar.php',
    role: 'shell',
    description: 'navegação compartilhada dos módulos PHP restantes',
  },
  {
    path: 'all/seguranca.php',
    role: 'auth',
    description: 'gate de autenticação dos módulos PHP',
  },
  {
    path: 'all/native_api_session.php',
    role: 'auth',
    description: 'hidrata $_SESSION a partir da sessão nativa',
  },
  {
    path: 'all/session.php',
    role: 'auth',
    description: 'ciclo de vida da sessão PHP',
  },
  {
    path: 'all/permissoes.php',
    role: 'authz',
    description: 'traduz módulos/permissões para variáveis PHP',
  },
  {
    path: 'all/conect.php',
    role: 'database',
    description: 'conexões PDO usadas pelo legado',
  },
  {
    path: 'all/app_url.php',
    role: 'bridge',
    description: 'URLs de transição entre PHP e Next',
  },
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
  const withoutComments = content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const matcher =
    /(?:\.\.\/|\.\/|\/)*[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.php(?:[?#][^"'`\s<>()]*)?/gi;
  const values = [];
  let match;

  while ((match = matcher.exec(withoutComments)) !== null) {
    values.push({
      literal: match[0],
      index: match.index,
    });
  }

  return values;
}

function resolveReferenceCandidates(sourceFile, content, reference) {
  const clean = reference.literal
    .replaceAll('\\', '/')
    .split(/[?#]/, 1)[0];

  if (!clean) return [];

  const sourceDirectory = path.posix.dirname(sourceFile);
  const candidates = new Set();

  if (clean.startsWith('/')) {
    candidates.add(normalizedTarget(clean));
  } else {
    candidates.add(
      normalizedTarget(path.posix.join(sourceDirectory, clean)),
    );
  }

  const before = content.slice(
    Math.max(0, reference.index - 100),
    reference.index,
  );

  // PHP frequently writes: __DIR__ . '/file.php'. In that form the slash is
  // relative to the current file directory, not the repository root.
  if (/__DIR__\s*\.\s*['"]?$/.test(before)) {
    candidates.add(
      normalizedTarget(
        path.posix.join(sourceDirectory, clean.replace(/^\/+/, '')),
      ),
    );
  }

  return [...candidates];
}

function references(target) {
  const normalized = normalizedTarget(target);
  const results = [];
  const seen = new Set();

  for (const file of runtimeFiles) {
    if (file === target) continue;

    let content = '';
    try {
      content = readFileSync(path.join(root, file), 'utf8');
    } catch {
      continue;
    }

    for (const reference of extractPhpPathLiterals(content)) {
      const candidates = resolveReferenceCandidates(file, content, reference);

      if (!candidates.includes(normalized)) {
        continue;
      }

      const key = `${file}\0${reference.literal}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        file,
        literal: reference.literal,
      });
    }
  }

  return results;
}

function rootDirectory(file) {
  return file.includes('/') ? file.split('/')[0] : '.';
}

const targets = shellTargets.map((target) => ({
  ...target,
  exists: tracked.includes(target.path),
  refs: references(target.path),
}));

console.log('Auditoria de retirada do shell PHP');
console.log('=================================');
console.log(`Runtime rastreado: ${runtimeFiles.length} arquivo(s)`);

const consumerFiles = new Set();

for (const target of targets) {
  console.log(
    `\n${target.exists ? 'KEEP' : 'REMOVED'}  ${target.path} ` +
      `[${target.role}]`,
  );
  console.log(`      ${target.description}`);

  if (target.refs.length === 0) {
    console.log('      consumidores: 0');
    continue;
  }

  console.log(`      consumidores: ${target.refs.length}`);
  for (const ref of target.refs) {
    consumerFiles.add(ref.file);
    console.log(`        <- ${ref.file}  [${ref.literal}]`);
  }
}

const byRoot = new Map();
for (const file of consumerFiles) {
  const dir = rootDirectory(file);
  byRoot.set(dir, (byRoot.get(dir) ?? 0) + 1);
}

console.log('\nDomínios que ainda bloqueiam a retirada do shell:');
if (byRoot.size === 0) {
  console.log('  READY: nenhum consumidor de shell PHP encontrado.');
} else {
  for (const [dir, count] of [...byRoot.entries()].sort(
    (left, right) =>
      right[1] - left[1] || left[0].localeCompare(right[0], 'pt-BR'),
  )) {
    console.log(`  ${String(count).padStart(4)}  ${dir}`);
  }
}

const phpConsumers = [...consumerFiles].filter((file) => file.endsWith('.php'));
console.log(
  `\nResumo: ${consumerFiles.size} arquivo(s) de runtime consomem o shell; ` +
    `${phpConsumers.length} são PHP.`,
);

const criticalAuthTargets = targets.filter((target) =>
  ['all/seguranca.php', 'all/native_api_session.php', 'all/session.php'].includes(
    target.path,
  ),
);
const criticalConsumers = new Set(
  criticalAuthTargets.flatMap((target) => target.refs.map((ref) => ref.file)),
);

if (criticalConsumers.size === 0) {
  console.log(
    'READY-AUTH: a ponte de autenticação PHP não possui consumidores externos.',
  );
} else {
  console.log(
    `KEEP-AUTH: ${criticalConsumers.size} arquivo(s) ainda dependem da ponte ` +
      'de autenticação PHP.',
  );
}

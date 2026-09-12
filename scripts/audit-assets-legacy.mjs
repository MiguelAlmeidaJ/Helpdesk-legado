import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const self = 'scripts/audit-assets-legacy.mjs';
const documentation = 'docs/ASSETS-DECOMMISSION.md';

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

const legacyAssetEntryPoints = [
  'ativos/ativos.php',
  'ativos/ativos_antiga.php',
  'ativos/ativos_conect.php',
  'ativos/ativos_delete.php',
  'ativos/ativos_edit.php',
  'ativos/ativos_insert.php',
  'ativos/ativos_prog.php',
  'ativos/ativos_programas.php',
  'ativos/downloads.php',
  'ativos/gerar_relatorio.php',
  'ativos/home.php',
  'ativos/patrimonio_delete_img.php',
  'ativos/patrimonios.php',
  'ativos/patrimonios_delete.php',
  'ativos/patrimonios_edit.php',
  'ativos/patrimonios_edit_imagem.php',
  'ativos/patrimonios_insert.php',
  'ativos/processos.php',
  'ativos/programas.php',
];

const retiredIntegrationMarkers = [
  { label: 'ConnectionPluginsApp()', matcher: /\bConnectionPluginsApp\s*\(/ },
  { label: 'ConnectionPatrimonios()', matcher: /\bConnectionPatrimonios\s*\(/ },
  { label: 'banco plugins_app', matcher: /\bplugins_app\b/i },
  { label: 'tabela comando_ativos', matcher: /\bcomando_ativos\b/i },
  { label: 'tabela programas_instalados', matcher: /\bprogramas_instalados\b/i },
  { label: 'tabela processos_ativos', matcher: /\bprocessos_ativos\b/i },
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

const remainingLegacyFiles = tracked.filter((file) => file.startsWith('ativos/'));

const runtimeFiles = tracked.filter(
  (file) =>
    file !== self &&
    file !== documentation &&
    !file.startsWith('ativos/') &&
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

  for (const source of [withoutComments(content)]) {
    while ((match = matcher.exec(source)) !== null) {
      values.push(match[0]);
    }
  }

  return [...new Set(values)];
}

function resolveReference(sourceFile, literal) {
  const clean = literal.replaceAll('\\', '/').split(/[?#]/, 1)[0];

  if (!clean) return '';

  if (clean.startsWith('/')) {
    return normalizedTarget(clean);
  }

  return normalizedTarget(
    path.posix.join(path.posix.dirname(sourceFile), clean),
  );
}

const targets = new Set(legacyAssetEntryPoints.map(normalizedTarget));
const references = [];
const integrationResidues = [];

for (const file of runtimeFiles) {
  let content = '';

  try {
    content = readFileSync(path.join(root, file), 'utf8');
  } catch {
    continue;
  }

  const source = withoutComments(content);

  for (const marker of retiredIntegrationMarkers) {
    if (marker.matcher.test(source)) {
      integrationResidues.push({ file, label: marker.label });
    }
  }

  for (const literal of extractPhpPathLiterals(content)) {
    const resolved = resolveReference(file, literal);

    if (targets.has(resolved)) {
      references.push({ file, literal, resolved });
    }
  }
}

console.log('Auditoria do módulo legado de ativos');
console.log(`  endpoints conhecidos: ${legacyAssetEntryPoints.length}`);
console.log(`  arquivos remanescentes em ativos/: ${remainingLegacyFiles.length}`);
console.log(`  runtimes externos verificados: ${runtimeFiles.length}`);
console.log(`  resíduos de integração encontrados: ${integrationResidues.length}`);

if (remainingLegacyFiles.length > 0) {
  console.error(
    `\nFalha: ${remainingLegacyFiles.length} arquivo(s) ainda existem em ativos/:`,
  );

  for (const file of remainingLegacyFiles) {
    console.error(`  ${file}`);
  }
}

if (references.length > 0) {
  console.error(
    `\nFalha: ${references.length} referência(s) externa(s) ainda apontam para ativos/*.php:`,
  );

  for (const reference of references) {
    console.error(
      `  ${reference.file}  [${reference.literal}] -> ${reference.resolved}`,
    );
  }
}

if (integrationResidues.length > 0) {
  console.error(
    `\nFalha: ${integrationResidues.length} resíduo(s) de integração do módulo aposentado ainda existem no runtime:`,
  );

  for (const residue of integrationResidues) {
    console.error(`  ${residue.file}  [${residue.label}]`);
  }
}

if (
  remainingLegacyFiles.length > 0 ||
  references.length > 0 ||
  integrationResidues.length > 0
) {
  console.error(
    '\nA aposentadoria de ativos ainda não está completa: remova runtime, referências e integrações residuais do módulo.',
  );
  process.exitCode = 2;
} else {
  console.log(
    '\nOK: ativos/ está removido e não há endpoints ou integrações residuais do módulo no runtime.',
  );
}

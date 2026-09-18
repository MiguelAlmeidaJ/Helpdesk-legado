import { createHash } from 'node:crypto';
import { constants, createReadStream, existsSync } from 'node:fs';
import { copyFile, lstat, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const envPath = path.join(repoRoot, '.env');

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const unknownArgs = args.filter((arg) => arg !== '--dry-run');

if (unknownArgs.length > 0) {
  throw new Error(`Argumentos desconhecidos: ${unknownArgs.join(', ')}`);
}

function configuredPath(envName, fallback) {
  const configured = process.env[envName]?.trim();
  return configured
    ? path.resolve(repoRoot, configured)
    : path.resolve(repoRoot, fallback);
}

const migrations = [
  {
    label: 'tickets',
    source: path.join(repoRoot, 'uploads'),
    target: configuredPath(
      'TICKET_UPLOAD_DIR',
      path.join('storage', 'uploads', 'tickets'),
    ),
  },
  {
    label: 'rd',
    source: path.join(repoRoot, 'uploads_rd'),
    target: configuredPath(
      'RD_UPLOAD_DIR',
      path.join('storage', 'uploads', 'rd'),
    ),
  },
];

function isSameOrInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  );
}

function assertNonOverlapping(label, source, target) {
  if (isSameOrInside(target, source) || isSameOrInside(source, target)) {
    throw new Error(
      `[${label}] origem e destino não podem se sobrepor: ${source} -> ${target}`,
    );
  }
}

async function optionalLstat(filePath) {
  try {
    return await lstat(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function sha256(filePath) {
  return await new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function sameContents(source, target) {
  const sourceStat = await lstat(source);
  const targetStat = await optionalLstat(target);

  if (!sourceStat.isFile()) {
    throw new Error(`Arquivo de origem inválido: ${source}`);
  }
  if (!targetStat) return false;
  if (!targetStat.isFile()) {
    throw new Error(`Destino existente não é arquivo regular: ${target}`);
  }
  if (sourceStat.size !== targetStat.size) return false;

  const [sourceHash, targetHash] = await Promise.all([
    sha256(source),
    sha256(target),
  ]);
  return sourceHash === targetHash;
}

async function* walkFiles(root, relativeDirectory = '') {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const relative = path.join(relativeDirectory, entry.name);
    const fullPath = path.join(root, relative);

    if (entry.isSymbolicLink()) {
      throw new Error(`Link simbólico não é permitido na migração: ${fullPath}`);
    }
    if (entry.isDirectory()) {
      yield* walkFiles(root, relative);
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`Entrada não suportada na migração: ${fullPath}`);
    }

    yield relative;
  }
}

async function migrateArea({ label, source, target }) {
  assertNonOverlapping(label, source, target);

  const sourceStat = await optionalLstat(source);
  if (!sourceStat) {
    console.log(`[${label}] origem ausente; nada para migrar: ${source}`);
    return { discovered: 0, copied: 0, existing: 0, planned: 0 };
  }
  if (!sourceStat.isDirectory()) {
    throw new Error(`[${label}] origem não é diretório: ${source}`);
  }

  console.log(`[${label}] ${source} -> ${target}`);
  const stats = { discovered: 0, copied: 0, existing: 0, planned: 0 };

  for await (const relative of walkFiles(source)) {
    stats.discovered += 1;
    const from = path.join(source, relative);
    const to = path.join(target, relative);
    const destinationStat = await optionalLstat(to);

    if (destinationStat) {
      if (await sameContents(from, to)) {
        stats.existing += 1;
        continue;
      }
      throw new Error(
        `[${label}] conflito: o destino já existe com conteúdo diferente: ${to}`,
      );
    }

    if (dryRun) {
      stats.planned += 1;
      continue;
    }

    await mkdir(path.dirname(to), { recursive: true });
    try {
      await copyFile(from, to, constants.COPYFILE_EXCL);
    } catch (error) {
      if (error?.code !== 'EEXIST' || !(await sameContents(from, to))) {
        throw error;
      }
      stats.existing += 1;
      continue;
    }

    if (!(await sameContents(from, to))) {
      throw new Error(`[${label}] falha na verificação após copiar: ${to}`);
    }
    stats.copied += 1;
  }

  return stats;
}

async function main() {
  console.log(dryRun ? 'Modo: simulação (--dry-run)' : 'Modo: migração');

  const total = { discovered: 0, copied: 0, existing: 0, planned: 0 };
  for (const migration of migrations) {
    const stats = await migrateArea(migration);
    for (const key of Object.keys(total)) {
      total[key] += stats[key];
    }
    console.log(
      `[${migration.label}] encontrados=${stats.discovered} ` +
        `copiados=${stats.copied} existentes=${stats.existing} ` +
        `planejados=${stats.planned}`,
    );
  }

  console.log(
    `Total: encontrados=${total.discovered} copiados=${total.copied} ` +
      `existentes=${total.existing} planejados=${total.planned}`,
  );

  if (dryRun) {
    console.log('Simulação concluída. Nenhum arquivo foi alterado.');
  } else {
    console.log(
      'Migração concluída e verificada. Os diretórios legados não foram removidos.',
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

import { config } from 'dotenv';
import path from 'node:path';
import { createNivel3Client } from '../index';

config({ path: path.resolve(process.cwd(), '../../.env') });

type CountRow = { total: number | bigint };

const PERMISSIONS = [
  ['Gerenciar catálogos', 'catalogos.gerenciar', 'Criar, editar e arquivar catálogos de TI e DevOps.'],
  ['Visualizar Catálogo de TI', 'catalogos.ti.visualizar', 'Visualizar catálogos do setor de TI.'],
  ['Visualizar Catálogo de DevOps', 'catalogos.devops.visualizar', 'Visualizar catálogos do setor de DevOps.'],
  ['Editar Catálogo de TI', 'catalogos.ti.editar', 'Criar e editar catálogos do setor de TI.'],
  ['Editar Catálogo de DevOps', 'catalogos.devops.editar', 'Criar e editar catálogos do setor de DevOps.'],
] as const;

const PERMISSION_MIGRATIONS = [
  ['catalog.ti.read', 'catalogos.ti.visualizar'],
  ['catalog.ti.manage', 'catalogos.ti.editar'],
  ['catalog.ti.edit', 'catalogos.ti.editar'],
  ['catalog.devops.read', 'catalogos.devops.visualizar'],
  ['catalog.devops.manage', 'catalogos.devops.editar'],
  ['catalog.devops.edit', 'catalogos.devops.editar'],
  ['catalog.manage', 'catalogos.gerenciar'],
  ['catalogo.ti.visualizar', 'catalogos.ti.visualizar'],
  ['catalogo.ti.gerenciar', 'catalogos.ti.editar'],
  ['catalogo.devops.visualizar', 'catalogos.devops.visualizar'],
  ['catalogo.devops.gerenciar', 'catalogos.devops.editar'],
  ['catalogos.ti.gerenciar', 'catalogos.ti.editar'],
  ['catalogos.devops.gerenciar', 'catalogos.devops.editar'],
] as const;

async function columnExists(
  db: ReturnType<typeof createNivel3Client>,
  table: string,
  column: string,
): Promise<boolean> {
  const rows = await db.$queryRawUnsafe<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    table,
    column,
  );
  return Number(rows[0]?.total ?? 0) > 0;
}

async function migratePermission(
  db: ReturnType<typeof createNivel3Client>,
  sourceSlug: string,
  targetSlug: string,
): Promise<void> {
  if (sourceSlug === targetSlug) return;

  await db.$executeRawUnsafe(
    `INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_at)
     SELECT rp.role_id, target.id, rp.granted_at
     FROM role_permissions rp
     INNER JOIN permissions source ON source.id = rp.permission_id
     INNER JOIN permissions target ON target.slug = ?
     WHERE source.slug = ?`,
    targetSlug,
    sourceSlug,
  );

  await db.$executeRawUnsafe(
    `INSERT IGNORE INTO user_permissions
       (user_id, permission_id, effect, assigned_at, assigned_by)
     SELECT up.user_id, target.id, up.effect, up.assigned_at, up.assigned_by
     FROM user_permissions up
     INNER JOIN permissions source ON source.id = up.permission_id
     INNER JOIN permissions target ON target.slug = ?
     WHERE source.slug = ?`,
    targetSlug,
    sourceSlug,
  );

  await db.$executeRawUnsafe('DELETE FROM permissions WHERE slug = ?', sourceSlug);
}

async function main() {
  const db = createNivel3Client();

  try {
    if (!(await columnExists(db, 'roles', 'sort_order'))) {
      await db.$executeRawUnsafe(
        'ALTER TABLE roles ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER is_system',
      );
      await db.$executeRawUnsafe('UPDATE roles SET sort_order = id * 10');
    }

    if (!(await columnExists(db, 'catalogos', 'arquivado_em'))) {
      await db.$executeRawUnsafe(
        'ALTER TABLE catalogos ADD COLUMN arquivado_em DATETIME NULL AFTER data_edicao',
      );
    }

    for (const [name, slug, description] of PERMISSIONS) {
      await db.$executeRawUnsafe(
        `INSERT INTO permissions
          (name, slug, module, description, created_at, updated_at)
         VALUES (?, ?, 'Catálogos', ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           module = VALUES(module),
           description = VALUES(description),
           updated_at = NOW()`,
        name,
        slug,
        description,
      );
    }

    // Quem já gerenciava TI e DevOps conserva a gestão global.
    await db.$executeRawUnsafe(
      `INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_at)
       SELECT DISTINCT ti.role_id, global_permission.id, NOW()
       FROM role_permissions ti
       INNER JOIN permissions ti_permission ON ti_permission.id = ti.permission_id
       INNER JOIN role_permissions devops ON devops.role_id = ti.role_id
       INNER JOIN permissions devops_permission ON devops_permission.id = devops.permission_id
       INNER JOIN permissions global_permission ON global_permission.slug = 'catalogos.gerenciar'
       WHERE ti_permission.slug IN (
         'catalog.ti.manage', 'catalogo.ti.gerenciar', 'catalogos.ti.gerenciar'
       )
         AND devops_permission.slug IN (
           'catalog.devops.manage', 'catalogo.devops.gerenciar', 'catalogos.devops.gerenciar'
         )`,
    );

    await db.$executeRawUnsafe(
      `INSERT IGNORE INTO user_permissions
         (user_id, permission_id, effect, assigned_at, assigned_by)
       SELECT DISTINCT ti.user_id, global_permission.id, 'allow', NOW(), ti.assigned_by
       FROM user_permissions ti
       INNER JOIN permissions ti_permission ON ti_permission.id = ti.permission_id
       INNER JOIN user_permissions devops ON devops.user_id = ti.user_id
       INNER JOIN permissions devops_permission ON devops_permission.id = devops.permission_id
       INNER JOIN permissions global_permission ON global_permission.slug = 'catalogos.gerenciar'
       WHERE ti.effect = 'allow'
         AND devops.effect = 'allow'
         AND ti_permission.slug IN (
           'catalog.ti.manage', 'catalogo.ti.gerenciar', 'catalogos.ti.gerenciar'
         )
         AND devops_permission.slug IN (
           'catalog.devops.manage', 'catalogo.devops.gerenciar', 'catalogos.devops.gerenciar'
         )`,
    );

    for (const [source, target] of PERMISSION_MIGRATIONS) {
      await migratePermission(db, source, target);
    }

    console.log('Estrutura de acesso atualizada.');
    console.log('  roles.sort_order: OK');
    console.log('  catalogos.arquivado_em: OK');
    console.log('  permissões de catálogo: 5 permissões normalizadas');
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

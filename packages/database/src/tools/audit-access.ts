import { config } from 'dotenv';
import path from 'node:path';
import { createNivel3Client } from '../index';

config({ path: path.resolve(process.cwd(), '../../.env') });

type Row = Record<string, unknown>;

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function normalizeRows(rows: Row[]): Row[] {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, normalizeValue(value)]),
    ),
  );
}

function printSection(title: string, rows: Row[]) {
  console.log(`\n=== ${title} ===`);

  if (rows.length === 0) {
    console.log('(sem registros)');
    return;
  }

  console.table(normalizeRows(rows));
}

async function query(client: ReturnType<typeof createNivel3Client>, sql: string) {
  return client.$queryRawUnsafe<Row[]>(sql);
}

async function main() {
  const db = createNivel3Client();

  try {
    const tables = await query(
      db,
      `SELECT TABLE_NAME AS table_name, TABLE_ROWS AS estimated_rows
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN (
           'usuarios',
           'roles',
           'permissions',
           'role_permissions',
           'user_roles',
           'user_permissions',
           'api_sessions'
         )
       ORDER BY TABLE_NAME`,
    );

    printSection('Tabelas de acesso existentes', tables);

    const roles = await query(
      db,
      `SELECT id, name, slug, is_system
       FROM roles
       ORDER BY id`,
    );
    printSection('Roles existentes', roles);

    const permissions = await query(
      db,
      `SELECT module, COUNT(*) AS permission_count
       FROM permissions
       GROUP BY module
       ORDER BY module`,
    );
    printSection('Permissões por módulo', permissions);

    const rolePermissions = await query(
      db,
      `SELECT
         r.id AS role_id,
         r.slug AS role_slug,
         COUNT(rp.permission_id) AS permission_count
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       GROUP BY r.id, r.slug
       ORDER BY r.id`,
    );
    printSection('Permissões atribuídas por role', rolePermissions);

    const roleUsers = await query(
      db,
      `SELECT
         r.id AS role_id,
         r.slug AS role_slug,
         COUNT(DISTINCT ur.user_id) AS user_count
       FROM roles r
       LEFT JOIN user_roles ur ON ur.role_id = r.id
       GROUP BY r.id, r.slug
       ORDER BY r.id`,
    );
    printSection('Usuários atribuídos por role', roleUsers);

    const overrides = await query(
      db,
      `SELECT effect, COUNT(*) AS override_count
       FROM user_permissions
       GROUP BY effect
       ORDER BY effect`,
    );
    printSection('Overrides diretos de permissão', overrides);

    const userTypes = await query(
      db,
      `SELECT tipo_usuario, COUNT(*) AS user_count
       FROM usuarios
       GROUP BY tipo_usuario
       ORDER BY tipo_usuario`,
    );
    printSection('Distribuição do legado tipo_usuario', userTypes);

    const coverage = await query(
      db,
      `SELECT
         (SELECT COUNT(*) FROM usuarios) AS users_total,
         (SELECT COUNT(DISTINCT user_id) FROM user_roles) AS users_with_role,
         (
           SELECT COUNT(*)
           FROM usuarios u
           WHERE NOT EXISTS (
             SELECT 1
             FROM user_roles ur
             WHERE ur.user_id = u.user_id
           )
         ) AS users_without_role,
         (SELECT COUNT(*) FROM api_sessions) AS api_sessions_total,
         (SELECT COUNT(*) FROM permissions) AS permissions_total,
         (SELECT COUNT(*) FROM roles) AS roles_total`,
    );
    printSection('Cobertura atual do RBAC', coverage);


    const ticketPermissionCatalog = await query(
      db,
      `SELECT id, name, slug, module
       FROM permissions
       WHERE module = 'Atendimentos'
       ORDER BY id`,
    );
    printSection('Catálogo de permissões de Atendimentos', ticketPermissionCatalog);

    const ticketRoleMatrix = await query(
      db,
      `SELECT
         r.slug AS role_slug,
         p.id AS permission_id,
         p.slug AS permission_slug,
         p.name AS permission_name
       FROM roles r
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE r.slug IN (
         'administrador',
         'atendimento-operador',
         'atendimento-gestor'
       )
         AND p.module = 'Atendimentos'
       ORDER BY r.slug, p.id`,
    );
    printSection('Matriz atual de Atendimentos por role', ticketRoleMatrix);

    const roleCardinality = await query(
      db,
      `SELECT roles_per_user, COUNT(*) AS user_count
       FROM (
         SELECT user_id, COUNT(*) AS roles_per_user
         FROM user_roles
         GROUP BY user_id
       ) role_counts
       GROUP BY roles_per_user
       ORDER BY roles_per_user`,
    );
    printSection('Quantidade de roles por usuário', roleCardinality);

    const statusCoverage = await query(
      db,
      `SELECT
         COALESCE(u.user_sts, -1) AS user_status,
         COUNT(*) AS users_total,
         SUM(
           CASE
             WHEN EXISTS (
               SELECT 1
               FROM user_roles ur
               WHERE ur.user_id = u.user_id
             )
             THEN 1
             ELSE 0
           END
         ) AS users_with_role,
         SUM(
           CASE
             WHEN NOT EXISTS (
               SELECT 1
               FROM user_roles ur
               WHERE ur.user_id = u.user_id
             )
             THEN 1
             ELSE 0
           END
         ) AS users_without_role
       FROM usuarios u
       GROUP BY COALESCE(u.user_sts, -1)
       ORDER BY user_status`,
    );
    printSection('Cobertura RBAC por status do usuário', statusCoverage);

    const missingRoleTicketProfiles = await query(
      db,
      `SELECT
         user_modulo_03 AS legacy_ticket_profile,
         COUNT(*) AS user_count
       FROM usuarios u
       WHERE NOT EXISTS (
         SELECT 1
         FROM user_roles ur
         WHERE ur.user_id = u.user_id
       )
       GROUP BY user_modulo_03
       ORDER BY user_count DESC, user_modulo_03`,
    );
    printSection(
      'Perfis legados de Atendimento entre usuários sem role',
      missingRoleTicketProfiles,
    );

    const apiSessionState = await query(
      db,
      `SELECT
         CASE
           WHEN revoked_at IS NOT NULL THEN 'revoked'
           WHEN expires_at <= NOW(6) THEN 'expired'
           ELSE 'active'
         END AS session_state,
         COUNT(*) AS session_count
       FROM api_sessions
       GROUP BY session_state
       ORDER BY session_state`,
    );
    printSection('Estado das api_sessions', apiSessionState);

    const unassignedPermissions = await query(
      db,
      `SELECT COUNT(*) AS permissions_without_role
       FROM permissions p
       WHERE NOT EXISTS (
         SELECT 1
         FROM role_permissions rp
         WHERE rp.permission_id = p.id
       )`,
    );
    printSection('Permissões sem role', unassignedPermissions);

    console.log(
      '\nAuditoria concluída em modo somente leitura. Nenhum dado foi alterado.',
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('\nFalha ao auditar RBAC.');

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});

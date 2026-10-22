import { config } from 'dotenv';
import path from 'node:path';
import {
  bootstrapRbacPermissions,
  RBAC_PERMISSION_SLUGS,
} from '../access/rbac-permissions';
import { createNivel3Client } from '../index';

config({ path: path.resolve(process.cwd(), '../../.env') });

type CountRow = { total: number | bigint };

const PERMISSION_MIGRATIONS = [
  ['atendimentos.finalizar', 'atendimentos.editar'],
  ['atendimentos.recorrencia.criar', 'atendimentos.recorrencia.visualizar'],
  ['devops.projetos.editar', 'devops.projetos.criar'],
  ['devops.tarefas.editar', 'devops.tarefas.criar'],
  ['marketing.tarefas.editar', 'marketing.tarefas.criar'],
  ['logistica.rd.visualizar', 'logistica.rd.acessar'],
  ['logistica.rd.criar', 'logistica.rd.acessar'],
  ['financeiro.visualizar', 'financeiro.acessar'],
  ['financeiro.editar', 'financeiro.acessar'],
  ['qualidade.plantao.visualizar', 'qualidade.acessar'],
  ['qualidade.plantao.gerenciar', 'qualidade.acessar'],
  ['qualidade.datas.visualizar', 'qualidade.acessar'],
  ['qualidade.datas.gerenciar', 'qualidade.acessar'],
  ['relatorios.visualizar', 'relatorios.acessar'],
  ['relatorios.gerar_pdf', 'relatorios.acessar'],
  ['usuarios.editar', 'usuarios.criar'],
  ['usuarios.permissoes_usuario', 'usuarios.permissoes_extras'],
  ['cadastros.clientes.editar', 'cadastros.clientes.criar'],
  ['cadastros.categorias.editar', 'cadastros.categorias.criar'],
  ['catalogos.ti.visualizar', 'catalogos.visualizar'],
  ['catalogos.devops.visualizar', 'catalogos.visualizar'],
  ['catalogos.ti.editar', 'catalogos.ti.criar'],
  ['catalogos.devops.editar', 'catalogos.devops.criar'],
  ['users.read', 'usuarios.visualizar'],
  ['users.create', 'usuarios.criar'],
  ['users.edit', 'usuarios.editar'],
  ['usuarios.editar_acesso', 'usuarios.atribuir_tipo'],
  ['usuarios.editar_acesso', 'usuarios.permissoes_usuario'],
  ['users.manage-access', 'usuarios.editar_acesso'],
  ['users.manage-access', 'usuarios.atribuir_tipo'],
  ['users.manage-access', 'usuarios.permissoes_usuario'],

  ['quality.on-call.read', 'qualidade.plantao.visualizar'],
  ['quality.on-call.manage', 'qualidade.plantao.gerenciar'],
  ['quality.dates.read', 'qualidade.datas.visualizar'],
  ['quality.dates.manage', 'qualidade.datas.gerenciar'],

  ['registrations.clients.read', 'cadastros.clientes.visualizar'],
  ['registrations.clients.create', 'cadastros.clientes.criar'],
  ['registrations.clients.edit', 'cadastros.clientes.editar'],
  ['registrations.clients.contacts.create', 'cadastros.clientes.criar'],
  ['registrations.clients.contacts.edit', 'cadastros.clientes.editar'],
  ['registrations.clients.locations.create', 'cadastros.clientes.criar'],
  ['registrations.clients.locations.edit', 'cadastros.clientes.editar'],

  ['registrations.categories.read', 'cadastros.categorias.visualizar'],
  ['registrations.categories.create', 'cadastros.categorias.criar'],
  ['registrations.categories.edit', 'cadastros.categorias.editar'],
  ['registrations.categories.subcategories.create', 'cadastros.categorias.criar'],
  ['registrations.categories.subcategories.edit', 'cadastros.categorias.editar'],
  ['registrations.categories.items.create', 'cadastros.categorias.criar'],
  ['registrations.categories.items.edit', 'cadastros.categorias.editar'],

  ['cadastros.clientes.contatos.criar', 'cadastros.clientes.criar'],
  ['cadastros.clientes.contatos.editar', 'cadastros.clientes.editar'],
  ['cadastros.clientes.locais.criar', 'cadastros.clientes.criar'],
  ['cadastros.clientes.locais.editar', 'cadastros.clientes.editar'],
  ['cadastros.categorias.subcategorias.criar', 'cadastros.categorias.criar'],
  ['cadastros.categorias.subcategorias.editar', 'cadastros.categorias.editar'],
  ['cadastros.categorias.itens.criar', 'cadastros.categorias.criar'],
  ['cadastros.categorias.itens.editar', 'cadastros.categorias.editar'],

  ['tickets.read', 'atendimentos.visualizar'],
  ['tickets.create', 'atendimentos.criar'],
  ['tickets.edit', 'atendimentos.editar'],
  ['tickets.classify', 'atendimentos.editar'],
  ['tickets.hold', 'atendimentos.colocar_espera'],
  ['tickets.execute', 'atendimentos.finalizar'],
  ['tickets.close', 'atendimentos.finalizar'],
  ['tickets.recurrence.create', 'atendimentos.recorrencia.criar'],
  ['tickets.timeline.read', 'atendimentos.timeline.visualizar'],
  ['tickets.audit', 'relatorios.visualizar'],
  ['tickets.audit', 'relatorios.gerar_pdf'],

  ['atendimentos.executar', 'atendimentos.finalizar'],
  ['atendimentos.auditar', 'relatorios.visualizar'],
  ['atendimentos.auditar', 'relatorios.gerar_pdf'],
  ['atendimentos.criar', 'atendimentos.recorrencia.criar'],
  ['atendimentos.visualizar', 'atendimentos.timeline.visualizar'],

  ['tickets.devops.read', 'devops.projetos.visualizar'],
  ['tickets.devops.read', 'devops.tarefas.visualizar'],
  ['tickets.devops.create', 'devops.projetos.criar'],
  ['tickets.devops.create', 'devops.tarefas.criar'],
  ['devops.projects.read', 'devops.projetos.visualizar'],
  ['devops.projects.create', 'devops.projetos.criar'],
  ['devops.projects.edit', 'devops.projetos.editar'],
  ['devops.tasks.read', 'devops.tarefas.visualizar'],
  ['devops.tasks.create', 'devops.tarefas.criar'],
  ['devops.tasks.edit', 'devops.tarefas.editar'],

  ['devops.atendimentos.visualizar', 'devops.projetos.visualizar'],
  ['devops.atendimentos.visualizar', 'devops.tarefas.visualizar'],
  ['devops.atendimentos.criar', 'devops.projetos.criar'],
  ['devops.atendimentos.criar', 'devops.tarefas.criar'],
  ['devops.atendimentos.editar', 'devops.projetos.editar'],
  ['devops.atendimentos.editar', 'devops.tarefas.editar'],

  ['tickets.marketing.read', 'marketing.tarefas.visualizar'],
  ['tickets.marketing.create', 'marketing.tarefas.criar'],
  ['marketing.tasks.read', 'marketing.tarefas.visualizar'],
  ['marketing.tasks.create', 'marketing.tarefas.criar'],
  ['marketing.tasks.edit', 'marketing.tarefas.editar'],
  ['marketing.tasks.hold', 'marketing.tarefas.colocar_espera'],
  ['marketing.tasks.close', 'marketing.tarefas.finalizar'],

  ['marketing.atendimentos.visualizar', 'marketing.tarefas.visualizar'],
  ['marketing.atendimentos.criar', 'marketing.tarefas.criar'],
  ['marketing.atendimentos.editar', 'marketing.tarefas.editar'],
  ['marketing.atendimentos.colocar_espera', 'marketing.tarefas.colocar_espera'],
  ['marketing.atendimentos.executar', 'marketing.tarefas.finalizar'],

  ['logistics.vehicle-agenda.read', 'logistica.agenda.agendar'],
  ['logistics.vehicle-agenda.manage', 'logistica.agenda.agendar'],
  ['logistics.expenses.read', 'logistica.rd.visualizar'],
  ['logistics.expenses.manage', 'logistica.rd.criar'],
  ['logistics.expenses.admin.read', 'logistica.rd.gestao'],
  ['logistics.expenses.admin.manage', 'logistica.rd.gestao'],
  ['logistics.expenses.approve', 'logistica.rd.gestao'],
  ['logistics.expenses.pay', 'logistica.rd.gestao'],

  ['logistica.agenda.visualizar', 'logistica.agenda.agendar'],
  ['logistica.agenda.gerenciar', 'logistica.agenda.agendar'],
  ['logistica.rd.gerenciar', 'logistica.rd.criar'],
  ['logistica.rd.admin.visualizar', 'logistica.rd.gestao'],
  ['logistica.rd.admin.gerenciar', 'logistica.rd.gestao'],
  ['logistica.rd.aprovar', 'logistica.rd.gestao'],
  ['logistica.rd.pagar', 'logistica.rd.gestao'],

  ['registrations.finance.read', 'financeiro.visualizar'],
  ['registrations.finance.manage', 'financeiro.editar'],
  ['cadastros.financeiro.visualizar', 'financeiro.visualizar'],
  ['cadastros.financeiro.gerenciar', 'financeiro.editar'],
  ['logistica.extratos.visualizar', 'financeiro.visualizar'],
  ['logistics.statements.read', 'financeiro.visualizar'],
  ['finance.read', 'financeiro.visualizar'],
  ['finance.manage', 'financeiro.editar'],

  ['catalog.ti.read', 'catalogos.ti.visualizar'],
  ['catalog.ti.create', 'catalogos.ti.criar'],
  ['catalog.ti.manage', 'catalogos.ti.editar'],
  ['catalog.ti.edit', 'catalogos.ti.editar'],
  ['catalog.devops.read', 'catalogos.devops.visualizar'],
  ['catalog.devops.create', 'catalogos.devops.criar'],
  ['catalog.devops.manage', 'catalogos.devops.editar'],
  ['catalog.devops.edit', 'catalogos.devops.editar'],
  ['catalogo.ti.visualizar', 'catalogos.ti.visualizar'],
  ['catalogo.ti.gerenciar', 'catalogos.ti.editar'],
  ['catalogo.devops.visualizar', 'catalogos.devops.visualizar'],
  ['catalogo.devops.gerenciar', 'catalogos.devops.editar'],
  ['catalogos.ti.gerenciar', 'catalogos.ti.editar'],
  ['catalogos.devops.gerenciar', 'catalogos.devops.editar'],
  ['catalogos.gerenciar', 'catalogos.ti.criar'],
  ['catalogos.gerenciar', 'catalogos.ti.editar'],
  ['catalogos.gerenciar', 'catalogos.devops.criar'],
  ['catalogos.gerenciar', 'catalogos.devops.editar'],
] as const;



async function columnExists(
  db: ReturnType<typeof createNivel3Client>,
  table: string,
  column: string,
): Promise<boolean> {
  const rows = await db.$queryRawUnsafe<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    table,
    column,
  );
  return Number(rows[0]?.total ?? 0) > 0;
}

async function copyPermission(
  db: ReturnType<typeof createNivel3Client>,
  sourceSlug: string,
  targetSlug: string,
): Promise<void> {
  if (sourceSlug === targetSlug) return;

  await db.$executeRawUnsafe(
    `INSERT INTO role_permissions (role_id, permission_id, granted_at)
     SELECT rp.role_id, target.id, rp.granted_at
     FROM role_permissions rp
     INNER JOIN permissions source ON source.id = rp.permission_id
     INNER JOIN permissions target ON target.slug = ?
     WHERE source.slug = ?
       AND NOT EXISTS (SELECT 1 FROM role_permissions existing WHERE existing.role_id = rp.role_id AND existing.permission_id = target.id)`,
    targetSlug,
    sourceSlug,
  );

  await db.$executeRawUnsafe(
    `INSERT INTO user_permissions
       (user_id, permission_id, effect, assigned_at, assigned_by)
     SELECT up.user_id, target.id, up.effect, up.assigned_at, up.assigned_by
     FROM user_permissions up
     INNER JOIN permissions source ON source.id = up.permission_id
     INNER JOIN permissions target ON target.slug = ?
     WHERE source.slug = ?
       AND NOT EXISTS (SELECT 1 FROM user_permissions existing WHERE existing.user_id = up.user_id AND existing.permission_id = target.id)`,
    targetSlug,
    sourceSlug,
  );
}

type FunctionRow = { id: number | bigint; name: string | null };
type IdRow = { id: number | bigint };
type PermissionIdRow = { permission_id: number | bigint };

async function migratePermissionsToFunctions(db: ReturnType<typeof createNivel3Client>) {
  const functions = await db.$queryRawUnsafe<FunctionRow[]>(
    'SELECT cargo_id AS id, cargo_nome AS name FROM cargos_n3',
  );
  for (const entry of functions) {
    const functionId = Number(entry.id);
    const slug = `function-${functionId}`;
    let roles = await db.$queryRawUnsafe<IdRow[]>('SELECT id FROM roles WHERE slug = ? LIMIT 1', slug);
    if (!roles[0]) {
      await db.$executeRawUnsafe(
        `INSERT INTO roles (name, slug, description, is_system, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, 1, 0, NOW(), NOW())`,
        entry.name ?? `Função #${functionId}`, slug, 'Permissões herdadas pela função de usuário.',
      );
      roles = await db.$queryRawUnsafe<IdRow[]>('SELECT id FROM roles WHERE slug = ? LIMIT 1', slug);
    }
    const roleId = Number(roles[0]?.id);
    const permissions = await db.$queryRawUnsafe<PermissionIdRow[]>(
      `SELECT DISTINCT source.permission_id FROM (
         SELECT up.permission_id FROM usuarios u
         INNER JOIN user_permissions up ON up.user_id = u.user_id AND up.effect = 'allow'
         WHERE u.user_funcao = ?
         UNION
         SELECT rp.permission_id FROM usuarios u
         INNER JOIN user_roles ur ON ur.user_id = u.user_id
         INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
         WHERE u.user_funcao = ?
       ) source`,
      functionId, functionId,
    );
    for (const permission of permissions) {
      const permissionId = Number(permission.permission_id);
      const exists = await db.$queryRawUnsafe<CountRow[]>(
        'SELECT COUNT(*) AS total FROM role_permissions WHERE role_id = ? AND permission_id = ?',
        roleId, permissionId,
      );
      if (Number(exists[0]?.total ?? 0) === 0) {
        await db.$executeRawUnsafe(
          'INSERT INTO role_permissions (role_id, permission_id, granted_at) VALUES (?, ?, NOW())',
          roleId, permissionId,
        );
      }
    }
  }
}

async function main() {
  const db = createNivel3Client();

  try {
    if (!(await columnExists(db, 'roles', 'sort_order'))) {
      await db.$executeRawUnsafe(
        'ALTER TABLE roles ADD sort_order INT NOT NULL DEFAULT 0',
      );
      await db.$executeRawUnsafe('UPDATE roles SET sort_order = id * 10');
    }

    if (!(await columnExists(db, 'catalogos', 'arquivado_em'))) {
      await db.$executeRawUnsafe(
        'ALTER TABLE catalogos ADD arquivado_em DATETIME NULL',
      );
    }

    await db.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS token_senha (
         id INT NOT NULL AUTO_INCREMENT,
         token VARCHAR(200) NULL,
         expire VARCHAR(200) NULL,
         email VARCHAR(100) NULL,
         PRIMARY KEY (id),
         INDEX idx_token_senha_token (token),
         INDEX idx_token_senha_email (email)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );

    const rbac = await bootstrapRbacPermissions(db);

    for (const [source, target] of PERMISSION_MIGRATIONS) {
      await copyPermission(db, source, target);
    }

    await migratePermissionsToFunctions(db);

    if (!RBAC_PERMISSION_SLUGS.length) {
      throw new Error('Catálogo canônico de permissões está vazio; limpeza abortada.');
    }

    const canonicalPlaceholders = RBAC_PERMISSION_SLUGS.map(() => '?').join(',');

    // Remove grants ligados a permissões que não fazem mais parte da matriz
    // antes de excluir as permissões antigas. Isso deixa o bootstrap seguro
    // mesmo em bancos onde as FKs não estejam configuradas com CASCADE.
    await db.$executeRawUnsafe(
      `DELETE rp
       FROM role_permissions rp
       INNER JOIN permissions p ON p.id = rp.permission_id
       WHERE p.slug NOT IN (${canonicalPlaceholders})`,
      ...RBAC_PERMISSION_SLUGS,
    );

    await db.$executeRawUnsafe(
      `DELETE up
       FROM user_permissions up
       INNER JOIN permissions p ON p.id = up.permission_id
       WHERE p.slug NOT IN (${canonicalPlaceholders})`,
      ...RBAC_PERMISSION_SLUGS,
    );

    await db.$executeRawUnsafe(
      `DELETE FROM permissions
       WHERE slug NOT IN (${canonicalPlaceholders})`,
      ...RBAC_PERMISSION_SLUGS,
    );

    console.log('Estrutura de acesso atualizada.');
    console.log('  roles.sort_order: OK');
    console.log('  catalogos.arquivado_em: OK');
    console.log('  token_senha: OK');
    console.log('  permissões RBAC simplificadas por página e ação: OK');
    console.log(
      `  catálogo canônico de permissões: ${RBAC_PERMISSION_SLUGS.length} permissões`,
    );
    console.log('  permissões fora da matriz atual removidas: OK');
    console.log(`  grants legados migrados para RBAC: ${rbac.migratedGrants}`);
    console.log(
      `  migração posicional aplicada agora: ${rbac.legacyMigrationApplied ? 'sim' : 'não'}`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

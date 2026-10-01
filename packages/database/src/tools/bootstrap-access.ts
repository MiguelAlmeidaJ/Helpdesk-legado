import { config } from 'dotenv';
import path from 'node:path';
import { bootstrapRbacPermissions } from '../access/rbac-permissions';
import { createNivel3Client } from '../index';

config({ path: path.resolve(process.cwd(), '../../.env') });

type CountRow = { total: number | bigint };

const PERMISSION_MIGRATIONS = [
  ['users.read', 'usuarios.visualizar'],
  ['users.create', 'usuarios.criar'],
  ['users.edit', 'usuarios.editar'],
  ['users.manage-access', 'usuarios.editar_acesso'],

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

const OBSOLETE_PERMISSION_SLUGS = [
  'users.read',
  'users.create',
  'users.edit',
  'users.manage-access',

  'quality.on-call.read',
  'quality.on-call.manage',
  'quality.dates.read',
  'quality.dates.manage',

  'registrations.clients.read',
  'registrations.clients.create',
  'registrations.clients.edit',
  'registrations.clients.contacts.create',
  'registrations.clients.contacts.edit',
  'registrations.clients.locations.create',
  'registrations.clients.locations.edit',
  'registrations.categories.read',
  'registrations.categories.create',
  'registrations.categories.edit',
  'registrations.categories.subcategories.create',
  'registrations.categories.subcategories.edit',
  'registrations.categories.items.create',
  'registrations.categories.items.edit',
  'registrations.finance.read',
  'registrations.finance.manage',

  'tickets.read',
  'tickets.create',
  'tickets.edit',
  'tickets.classify',
  'tickets.execute',
  'tickets.hold',
  'tickets.reject',
  'tickets.close',
  'tickets.audit',
  'tickets.radio',
  'tickets.recurrence.create',
  'tickets.timeline.read',
  'tickets.devops.read',
  'tickets.devops.create',
  'tickets.marketing.read',
  'tickets.marketing.create',

  'devops.projects.read',
  'devops.projects.create',
  'devops.projects.edit',
  'devops.tasks.read',
  'devops.tasks.create',
  'devops.tasks.edit',

  'marketing.tasks.read',
  'marketing.tasks.create',
  'marketing.tasks.edit',
  'marketing.tasks.hold',
  'marketing.tasks.close',

  'logistics.vehicle-agenda.read',
  'logistics.vehicle-agenda.manage',
  'logistics.expenses.read',
  'logistics.expenses.manage',
  'logistics.expenses.admin.read',
  'logistics.expenses.admin.manage',
  'logistics.expenses.approve',
  'logistics.expenses.pay',
  'logistics.statements.read',

  'finance.read',
  'finance.manage',
  'reports.read',
  'reports.pdf',
  'catalog.manage',
  'catalog.ti.read',
  'catalog.ti.create',
  'catalog.ti.edit',
  'catalog.devops.read',
  'catalog.devops.create',
  'catalog.devops.edit',

  'atendimentos.executar',
  'atendimentos.recusar',
  'atendimentos.editar_terceiros',
  'atendimentos.auditar',
  'atendimentos.radio',

  'devops.atendimentos.visualizar',
  'devops.atendimentos.criar',
  'devops.atendimentos.editar',
  'devops.atendimentos.executar',
  'devops.atendimentos.colocar_espera',
  'devops.atendimentos.recusar',
  'devops.atendimentos.editar_terceiros',

  'marketing.atendimentos.visualizar',
  'marketing.atendimentos.criar',
  'marketing.atendimentos.editar',
  'marketing.atendimentos.executar',
  'marketing.atendimentos.colocar_espera',
  'marketing.atendimentos.recusar',
  'marketing.atendimentos.editar_terceiros',

  'cadastros.clientes.contatos.criar',
  'cadastros.clientes.contatos.editar',
  'cadastros.clientes.locais.criar',
  'cadastros.clientes.locais.editar',
  'cadastros.categorias.subcategorias.criar',
  'cadastros.categorias.subcategorias.editar',
  'cadastros.categorias.itens.criar',
  'cadastros.categorias.itens.editar',
  'cadastros.financeiro.visualizar',
  'cadastros.financeiro.gerenciar',

  'catalogos.gerenciar',
  'catalogos.ti.gerenciar',
  'catalogos.devops.gerenciar',
  'catalogo.ti.visualizar',
  'catalogo.ti.gerenciar',
  'catalogo.devops.visualizar',
  'catalogo.devops.gerenciar',

  'logistica.agenda.visualizar',
  'logistica.agenda.gerenciar',
  'logistica.rd.gerenciar',
  'logistica.rd.admin.visualizar',
  'logistica.rd.admin.gerenciar',
  'logistica.rd.aprovar',
  'logistica.rd.pagar',
  'logistica.extratos.visualizar',
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

async function copyPermission(
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

    const rbac = await bootstrapRbacPermissions(db);

    for (const [source, target] of PERMISSION_MIGRATIONS) {
      await copyPermission(db, source, target);
    }

    if (OBSOLETE_PERMISSION_SLUGS.length) {
      const placeholders = OBSOLETE_PERMISSION_SLUGS.map(() => '?').join(',');
      await db.$executeRawUnsafe(
        `DELETE FROM permissions WHERE slug IN (${placeholders})`,
        ...OBSOLETE_PERMISSION_SLUGS,
      );
    }

    console.log('Estrutura de acesso atualizada.');
    console.log('  roles.sort_order: OK');
    console.log('  catalogos.arquivado_em: OK');
    console.log('  permissões RBAC simplificadas por página e ação: OK');
    console.log('  permissões legadas conhecidas removidas: OK');
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

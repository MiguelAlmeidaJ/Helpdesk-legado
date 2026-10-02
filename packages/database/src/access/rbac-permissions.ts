import type { Nivel3DatabaseClient } from '../index';

type DatabaseClient = Pick<Nivel3DatabaseClient, '$executeRawUnsafe' | '$queryRawUnsafe'>;

type CountRow = { total: number | bigint | string };

type PermissionDefinition = readonly [
  name: string,
  slug: string,
  module: string,
  description: string,
];

const RBAC_PERMISSIONS: readonly PermissionDefinition[] = [
  ['Ver Atendimento', 'atendimentos.visualizar', 'Atendimento', 'Visualizar atendimentos e seus detalhes.'],
  ['Criar Atendimento', 'atendimentos.criar', 'Atendimento', 'Abrir novos atendimentos.'],
  ['Editar Atendimento', 'atendimentos.editar', 'Atendimento', 'Editar e classificar atendimentos.'],
  ['Colocar em espera', 'atendimentos.colocar_espera', 'Atendimento', 'Colocar atendimentos em espera e retomá-los.'],
  ['Finalizar Atendimento', 'atendimentos.finalizar', 'Atendimento', 'Finalizar atendimentos.'],
  ['Criar Recorrência', 'atendimentos.recorrencia.criar', 'Atendimento', 'Criar e administrar recorrências de atendimento.'],
  ['Ver Linha do Tempo', 'atendimentos.timeline.visualizar', 'Atendimento', 'Visualizar a linha do tempo dos atendimentos.'],

  ['Ver Projetos', 'devops.projetos.visualizar', 'DevOps', 'Visualizar projetos DevOps.'],
  ['Criar Projetos', 'devops.projetos.criar', 'DevOps', 'Criar projetos DevOps.'],
  ['Editar Projetos', 'devops.projetos.editar', 'DevOps', 'Editar projetos DevOps.'],
  ['Ver Tarefas', 'devops.tarefas.visualizar', 'DevOps', 'Visualizar tarefas DevOps.'],
  ['Criar Tarefas', 'devops.tarefas.criar', 'DevOps', 'Criar tarefas DevOps.'],
  ['Editar Tarefas', 'devops.tarefas.editar', 'DevOps', 'Editar tarefas DevOps.'],

  ['Ver Tarefa', 'marketing.tarefas.visualizar', 'Marketing', 'Visualizar tarefas de Marketing.'],
  ['Criar Tarefa', 'marketing.tarefas.criar', 'Marketing', 'Criar tarefas de Marketing.'],
  ['Editar Tarefa', 'marketing.tarefas.editar', 'Marketing', 'Editar tarefas de Marketing.'],
  ['Colocar Tarefa em espera', 'marketing.tarefas.colocar_espera', 'Marketing', 'Colocar tarefas de Marketing em espera.'],
  ['Finalizar Tarefa', 'marketing.tarefas.finalizar', 'Marketing', 'Finalizar tarefas de Marketing.'],

  ['Agendar Veículo', 'logistica.agenda.agendar', 'Logística', 'Visualizar e gerenciar a agenda de veículos.'],
  ['Ver RD', 'logistica.rd.visualizar', 'Logística', 'Visualizar RDs permitidas ao usuário.'],
  ['Criar RD', 'logistica.rd.criar', 'Logística', 'Criar e editar as próprias RDs.'],
  ['Gestão de RDs', 'logistica.rd.gestao', 'Logística', 'Acessar a gestão administrativa de RDs.'],

  ['Ver Financeiro', 'financeiro.visualizar', 'Financeiro', 'Visualizar páginas, cadastros e extratos financeiros.'],
  ['Editar Financeiro', 'financeiro.editar', 'Financeiro', 'Criar e editar dados financeiros.'],

  ['Visualizar Plantão', 'qualidade.plantao.visualizar', 'Qualidade', 'Visualizar a escala semanal e a situação atual do plantão.'],
  ['Gerenciar Plantão', 'qualidade.plantao.gerenciar', 'Qualidade', 'Alterar plantonistas e o horário operacional do plantão.'],
  ['Visualizar Datas comemorativas', 'qualidade.datas.visualizar', 'Qualidade', 'Visualizar feriados nacionais e datas especiais do calendário corporativo.'],
  ['Gerenciar Datas comemorativas', 'qualidade.datas.gerenciar', 'Qualidade', 'Cadastrar e remover datas especiais do calendário corporativo.'],

  ['Ver relatórios', 'relatorios.visualizar', 'Relatórios', 'Visualizar relatórios e seus dados.'],
  ['Gerar PDF', 'relatorios.gerar_pdf', 'Relatórios', 'Gerar e baixar relatórios em PDF.'],

  ['Ver Usuários', 'usuarios.visualizar', 'Cadastro', 'Visualizar usuários e seus dados básicos.'],
  ['Criar Usuários', 'usuarios.criar', 'Cadastro', 'Cadastrar novos usuários.'],
  ['Editar Usuários', 'usuarios.editar', 'Cadastro', 'Editar usuários existentes.'],

  ['Ver Clientes', 'cadastros.clientes.visualizar', 'Cadastro', 'Visualizar clientes, contatos e locais.'],
  ['Criar Clientes', 'cadastros.clientes.criar', 'Cadastro', 'Cadastrar clientes, contatos e locais.'],
  ['Editar Clientes', 'cadastros.clientes.editar', 'Cadastro', 'Editar clientes, contatos e locais.'],

  ['Ver Categorias', 'cadastros.categorias.visualizar', 'Cadastro', 'Visualizar categorias, subcategorias e itens.'],
  ['Criar Categorias', 'cadastros.categorias.criar', 'Cadastro', 'Cadastrar categorias, subcategorias e itens.'],
  ['Editar Categorias', 'cadastros.categorias.editar', 'Cadastro', 'Editar categorias, subcategorias e itens.'],

  ['Ver Catálogos de TI', 'catalogos.ti.visualizar', 'Cadastro', 'Visualizar catálogos do setor de TI.'],
  ['Criar Catálogos de TI', 'catalogos.ti.criar', 'Cadastro', 'Criar catálogos do setor de TI.'],
  ['Editar Catálogos de TI', 'catalogos.ti.editar', 'Cadastro', 'Editar e arquivar catálogos do setor de TI.'],
  ['Ver Catálogos de DevOps', 'catalogos.devops.visualizar', 'Cadastro', 'Visualizar catálogos do setor de DevOps.'],
  ['Criar Catálogos de DevOps', 'catalogos.devops.criar', 'Cadastro', 'Criar catálogos do setor de DevOps.'],
  ['Editar Catálogos de DevOps', 'catalogos.devops.editar', 'Cadastro', 'Editar e arquivar catálogos do setor de DevOps.'],

  ['Gerenciar permissões', 'usuarios.editar_acesso', 'Administração', 'Vincular tipos de usuário e administrar permissões.'],
];
export const RBAC_PERMISSION_SLUGS = RBAC_PERMISSIONS.map(
  ([, slug]) => slug,
) as readonly string[];

type LegacyRule = {
  slug: string;
  column: string;
  position: number;
  minimum?: number;
  values?: readonly number[];
};

const LEGACY_RULES: readonly LegacyRule[] = [
  { slug: 'usuarios.visualizar', column: 'user_modulo_01', position: 2, minimum: 1 },
  { slug: 'usuarios.criar', column: 'user_modulo_01', position: 3, minimum: 1 },
  { slug: 'usuarios.editar', column: 'user_modulo_01', position: 4, minimum: 1 },
  { slug: 'usuarios.editar_acesso', column: 'user_modulo_01', position: 5, minimum: 1 },

  { slug: 'cadastros.clientes.visualizar', column: 'user_modulo_02', position: 2, minimum: 1 },
  { slug: 'cadastros.clientes.criar', column: 'user_modulo_02', position: 2, minimum: 2 },
  { slug: 'cadastros.clientes.editar', column: 'user_modulo_02', position: 2, minimum: 3 },
  { slug: 'cadastros.categorias.visualizar', column: 'user_modulo_02', position: 5, minimum: 1 },
  { slug: 'cadastros.categorias.criar', column: 'user_modulo_02', position: 5, minimum: 2 },
  { slug: 'cadastros.categorias.editar', column: 'user_modulo_02', position: 5, minimum: 3 },

  { slug: 'atendimentos.visualizar', column: 'user_modulo_03', position: 1, minimum: 1 },
  { slug: 'atendimentos.criar', column: 'user_modulo_03', position: 2, minimum: 2 },
  { slug: 'atendimentos.editar', column: 'user_modulo_03', position: 2, minimum: 3 },
  { slug: 'atendimentos.finalizar', column: 'user_modulo_03', position: 3, minimum: 2 },
  { slug: 'atendimentos.colocar_espera', column: 'user_modulo_03', position: 4, minimum: 2 },
  { slug: 'atendimentos.recorrencia.criar', column: 'user_modulo_03', position: 2, minimum: 2 },
  { slug: 'atendimentos.timeline.visualizar', column: 'user_modulo_03', position: 1, minimum: 1 },

  { slug: 'devops.projetos.visualizar', column: 'user_modulo_05', position: 1, minimum: 1 },
  { slug: 'devops.projetos.criar', column: 'user_modulo_05', position: 2, minimum: 2 },
  { slug: 'devops.projetos.editar', column: 'user_modulo_05', position: 2, minimum: 3 },
  { slug: 'devops.tarefas.visualizar', column: 'user_modulo_05', position: 1, minimum: 1 },
  { slug: 'devops.tarefas.criar', column: 'user_modulo_05', position: 2, minimum: 2 },
  { slug: 'devops.tarefas.editar', column: 'user_modulo_05', position: 2, minimum: 3 },

  { slug: 'relatorios.visualizar', column: 'user_modulo_08', position: 1, minimum: 1 },
  { slug: 'relatorios.gerar_pdf', column: 'user_modulo_08', position: 1, minimum: 1 },
  { slug: 'marketing.tarefas.visualizar', column: 'user_modulo_08', position: 1, minimum: 1 },
  { slug: 'marketing.tarefas.criar', column: 'user_modulo_08', position: 2, minimum: 2 },
  { slug: 'marketing.tarefas.editar', column: 'user_modulo_08', position: 2, minimum: 3 },
  { slug: 'marketing.tarefas.finalizar', column: 'user_modulo_08', position: 3, minimum: 2 },
  { slug: 'marketing.tarefas.colocar_espera', column: 'user_modulo_08', position: 4, minimum: 2 },
  { slug: 'catalogos.ti.visualizar', column: 'user_modulo_08', position: 5, values: [1, 2, 5, 6] },
  { slug: 'catalogos.ti.criar', column: 'user_modulo_08', position: 5, values: [2, 6] },
  { slug: 'catalogos.ti.editar', column: 'user_modulo_08', position: 5, values: [2, 6] },
  { slug: 'catalogos.devops.visualizar', column: 'user_modulo_08', position: 5, values: [3, 4, 5, 6] },
  { slug: 'catalogos.devops.criar', column: 'user_modulo_08', position: 5, values: [4, 6] },
  { slug: 'catalogos.devops.editar', column: 'user_modulo_08', position: 5, values: [4, 6] },

  { slug: 'logistica.rd.visualizar', column: 'user_modulo_09', position: 1, minimum: 1 },
  { slug: 'logistica.rd.criar', column: 'user_modulo_09', position: 1, minimum: 1 },
  { slug: 'logistica.agenda.agendar', column: 'user_modulo_09', position: 2, minimum: 1 },
  { slug: 'logistica.rd.gestao', column: 'user_modulo_09', position: 3, minimum: 2 },
  { slug: 'financeiro.visualizar', column: 'user_modulo_09', position: 10, minimum: 1 },
  { slug: 'financeiro.editar', column: 'user_modulo_09', position: 10, minimum: 2 },
];
function legacyCondition(rule: LegacyRule): string {
  const expression = `SUBSTRING(COALESCE(u.${rule.column}, ''), ${rule.position}, 1)`;

  if (rule.values?.length) {
    return `${expression} IN (${rule.values.map((value) => `'${value}'`).join(', ')})`;
  }

  return `CAST(${expression} AS UNSIGNED) >= ${rule.minimum ?? 1}`;
}

export async function bootstrapRbacPermissions(
  db: DatabaseClient,
): Promise<{ migratedGrants: number; legacyMigrationApplied: boolean }> {
  await db.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS access_migrations (
       migration_key VARCHAR(120) NOT NULL,
       applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (migration_key)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );

  for (const [name, slug, module, description] of RBAC_PERMISSIONS) {
    await db.$executeRawUnsafe(
      `INSERT INTO permissions
         (name, slug, module, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         module = VALUES(module),
         description = VALUES(description),
         updated_at = NOW()`,
      name,
      slug,
      module,
      description,
    );
  }

  const migrationKey = 'rbac-only-permissions-v1';
  const applied = await db.$queryRawUnsafe<CountRow[]>(
    'SELECT COUNT(*) AS total FROM access_migrations WHERE migration_key = ?',
    migrationKey,
  );

  if (Number(applied[0]?.total ?? 0) > 0) {
    return { migratedGrants: 0, legacyMigrationApplied: false };
  }

  let migratedGrants = 0;

  for (const rule of LEGACY_RULES) {
    migratedGrants += await db.$executeRawUnsafe(
      `INSERT IGNORE INTO user_permissions
         (user_id, permission_id, effect, assigned_at, assigned_by)
       SELECT u.user_id, p.id, 'allow', NOW(), NULL
       FROM usuarios u
       INNER JOIN permissions p ON p.slug = ?
       WHERE ${legacyCondition(rule)}`,
      rule.slug,
    );
  }

  await db.$executeRawUnsafe(
    'INSERT INTO access_migrations (migration_key, applied_at) VALUES (?, NOW())',
    migrationKey,
  );

  return { migratedGrants, legacyMigrationApplied: true };
}

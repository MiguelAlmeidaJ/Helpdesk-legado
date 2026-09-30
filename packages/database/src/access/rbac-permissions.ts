import type { Nivel3DatabaseClient } from '../index';

type DatabaseClient = Pick<Nivel3DatabaseClient, '$executeRawUnsafe'>;

type PermissionDefinition = readonly [
  name: string,
  slug: string,
  module: string,
  description: string,
];

const RBAC_PERMISSIONS: readonly PermissionDefinition[] = [
  ['Visualizar usuários', 'usuarios.visualizar', 'Usuários', 'Visualizar usuários e seus dados básicos.'],
  ['Cadastrar usuários', 'usuarios.criar', 'Usuários', 'Cadastrar novos usuários.'],
  ['Editar usuários', 'usuarios.editar', 'Usuários', 'Editar usuários existentes.'],
  ['Editar acesso de usuários', 'usuarios.editar_acesso', 'Usuários', 'Vincular tipos de usuário e administrar acesso.'],

  ['Visualizar atendimentos', 'atendimentos.visualizar', 'Atendimentos', 'Visualizar atendimentos.'],
  ['Criar atendimentos', 'atendimentos.criar', 'Atendimentos', 'Abrir novos atendimentos.'],
  ['Editar atendimentos', 'atendimentos.editar', 'Atendimentos', 'Editar e classificar atendimentos.'],
  ['Executar atendimentos', 'atendimentos.executar', 'Atendimentos', 'Executar e concluir atendimentos.'],
  ['Colocar atendimento em espera', 'atendimentos.colocar_espera', 'Atendimentos', 'Colocar atendimentos em espera.'],
  ['Recusar atendimento', 'atendimentos.recusar', 'Atendimentos', 'Recusar atendimentos.'],
  ['Editar atendimentos de terceiros', 'atendimentos.editar_terceiros', 'Atendimentos', 'Executar ações operacionais em atendimentos de outros usuários.'],
  ['Auditar atendimentos', 'atendimentos.auditar', 'Atendimentos', 'Acessar relatórios e auditoria de atendimentos.'],
  ['Acessar rádio', 'atendimentos.radio', 'Atendimentos', 'Acessar o rádio do Helpdesk.'],

  ['Visualizar atendimentos DevOps', 'devops.atendimentos.visualizar', 'DevOps', 'Visualizar projetos e tarefas DevOps.'],
  ['Criar atendimentos DevOps', 'devops.atendimentos.criar', 'DevOps', 'Criar projetos e tarefas DevOps.'],
  ['Editar atendimentos DevOps', 'devops.atendimentos.editar', 'DevOps', 'Editar e classificar projetos e tarefas DevOps.'],
  ['Executar atendimentos DevOps', 'devops.atendimentos.executar', 'DevOps', 'Executar e concluir projetos e tarefas DevOps.'],
  ['Colocar DevOps em espera', 'devops.atendimentos.colocar_espera', 'DevOps', 'Colocar tarefas DevOps em espera.'],
  ['Recusar atendimento DevOps', 'devops.atendimentos.recusar', 'DevOps', 'Recusar ou redirecionar tarefas DevOps.'],
  ['Editar DevOps de terceiros', 'devops.atendimentos.editar_terceiros', 'DevOps', 'Atuar em projetos e tarefas DevOps de outros usuários.'],

  ['Visualizar atendimentos Marketing', 'marketing.atendimentos.visualizar', 'Marketing', 'Visualizar tickets de Marketing.'],
  ['Criar atendimentos Marketing', 'marketing.atendimentos.criar', 'Marketing', 'Criar tickets de Marketing.'],
  ['Editar atendimentos Marketing', 'marketing.atendimentos.editar', 'Marketing', 'Editar e classificar tickets de Marketing.'],
  ['Executar atendimentos Marketing', 'marketing.atendimentos.executar', 'Marketing', 'Executar e concluir tickets de Marketing.'],
  ['Colocar Marketing em espera', 'marketing.atendimentos.colocar_espera', 'Marketing', 'Colocar tickets de Marketing em espera.'],
  ['Recusar atendimento Marketing', 'marketing.atendimentos.recusar', 'Marketing', 'Recusar ou redirecionar tickets de Marketing.'],
  ['Editar Marketing de terceiros', 'marketing.atendimentos.editar_terceiros', 'Marketing', 'Atuar em tickets de Marketing de outros usuários.'],

  ['Visualizar clientes', 'cadastros.clientes.visualizar', 'Cadastros', 'Visualizar clientes.'],
  ['Cadastrar clientes', 'cadastros.clientes.criar', 'Cadastros', 'Cadastrar clientes.'],
  ['Editar clientes', 'cadastros.clientes.editar', 'Cadastros', 'Editar clientes.'],
  ['Cadastrar contatos de clientes', 'cadastros.clientes.contatos.criar', 'Cadastros', 'Cadastrar contatos de clientes.'],
  ['Editar contatos de clientes', 'cadastros.clientes.contatos.editar', 'Cadastros', 'Editar contatos de clientes.'],
  ['Cadastrar locais de clientes', 'cadastros.clientes.locais.criar', 'Cadastros', 'Cadastrar locais de clientes.'],
  ['Editar locais de clientes', 'cadastros.clientes.locais.editar', 'Cadastros', 'Editar locais de clientes.'],
  ['Visualizar categorias', 'cadastros.categorias.visualizar', 'Cadastros', 'Visualizar categorias.'],
  ['Cadastrar categorias', 'cadastros.categorias.criar', 'Cadastros', 'Cadastrar categorias.'],
  ['Editar categorias', 'cadastros.categorias.editar', 'Cadastros', 'Editar categorias.'],
  ['Cadastrar subcategorias', 'cadastros.categorias.subcategorias.criar', 'Cadastros', 'Cadastrar subcategorias.'],
  ['Editar subcategorias', 'cadastros.categorias.subcategorias.editar', 'Cadastros', 'Editar subcategorias.'],
  ['Cadastrar itens', 'cadastros.categorias.itens.criar', 'Cadastros', 'Cadastrar itens de categoria.'],
  ['Editar itens', 'cadastros.categorias.itens.editar', 'Cadastros', 'Editar itens de categoria.'],
  ['Visualizar cadastros financeiros', 'cadastros.financeiro.visualizar', 'Cadastros', 'Visualizar cadastros auxiliares financeiros.'],
  ['Gerenciar cadastros financeiros', 'cadastros.financeiro.gerenciar', 'Cadastros', 'Criar e editar cadastros auxiliares financeiros.'],

  ['Gerenciar catálogos', 'catalogos.gerenciar', 'Catálogos', 'Criar, editar e arquivar catálogos de TI e DevOps.'],
  ['Visualizar Catálogo de TI', 'catalogos.ti.visualizar', 'Catálogos', 'Visualizar catálogos do setor de TI.'],
  ['Editar Catálogo de TI', 'catalogos.ti.editar', 'Catálogos', 'Editar catálogos do setor de TI.'],
  ['Visualizar Catálogo de DevOps', 'catalogos.devops.visualizar', 'Catálogos', 'Visualizar catálogos do setor de DevOps.'],
  ['Editar Catálogo de DevOps', 'catalogos.devops.editar', 'Catálogos', 'Editar catálogos do setor de DevOps.'],

  ['Visualizar agenda de veículos', 'logistica.agenda.visualizar', 'Logística', 'Visualizar a agenda de veículos.'],
  ['Gerenciar agenda de veículos', 'logistica.agenda.gerenciar', 'Logística', 'Criar e editar compromissos e veículos.'],
  ['Visualizar RDs', 'logistica.rd.visualizar', 'Logística', 'Visualizar as próprias RDs.'],
  ['Gerenciar RDs', 'logistica.rd.gerenciar', 'Logística', 'Criar e editar as próprias RDs.'],
  ['Visualizar administração de RDs', 'logistica.rd.admin.visualizar', 'Logística', 'Visualizar RDs de todos os usuários.'],
  ['Gerenciar administração de RDs', 'logistica.rd.admin.gerenciar', 'Logística', 'Gerenciar RDs de todos os usuários.'],
  ['Aprovar RDs', 'logistica.rd.aprovar', 'Logística', 'Aprovar ou reprovar RDs.'],
  ['Pagar RDs', 'logistica.rd.pagar', 'Logística', 'Registrar pagamentos de RDs.'],
  ['Visualizar extratos', 'logistica.extratos.visualizar', 'Logística', 'Visualizar extratos financeiros.'],

  ['Visualizar Plantão', 'qualidade.plantao.visualizar', 'Qualidade', 'Visualizar a escala semanal e a situação atual do plantão.'],
  ['Gerenciar Plantão', 'qualidade.plantao.gerenciar', 'Qualidade', 'Alterar plantonistas e o horário operacional do plantão.'],
  ['Visualizar Datas comemorativas', 'qualidade.datas.visualizar', 'Qualidade', 'Visualizar feriados nacionais e datas especiais do calendário corporativo.'],
  ['Gerenciar Datas comemorativas', 'qualidade.datas.gerenciar', 'Qualidade', 'Cadastrar e remover datas especiais do calendário corporativo.'],
];

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
  { slug: 'cadastros.clientes.contatos.criar', column: 'user_modulo_02', position: 3, minimum: 2 },
  { slug: 'cadastros.clientes.contatos.editar', column: 'user_modulo_02', position: 3, minimum: 3 },
  { slug: 'cadastros.clientes.locais.criar', column: 'user_modulo_02', position: 4, minimum: 3 },
  { slug: 'cadastros.clientes.locais.editar', column: 'user_modulo_02', position: 4, minimum: 3 },
  { slug: 'cadastros.categorias.visualizar', column: 'user_modulo_02', position: 5, minimum: 1 },
  { slug: 'cadastros.categorias.criar', column: 'user_modulo_02', position: 5, minimum: 2 },
  { slug: 'cadastros.categorias.editar', column: 'user_modulo_02', position: 5, minimum: 3 },
  { slug: 'cadastros.categorias.subcategorias.criar', column: 'user_modulo_02', position: 6, minimum: 2 },
  { slug: 'cadastros.categorias.subcategorias.editar', column: 'user_modulo_02', position: 6, minimum: 3 },
  { slug: 'cadastros.categorias.itens.criar', column: 'user_modulo_02', position: 7, minimum: 2 },
  { slug: 'cadastros.categorias.itens.editar', column: 'user_modulo_02', position: 7, minimum: 3 },

  { slug: 'atendimentos.visualizar', column: 'user_modulo_03', position: 1, minimum: 1 },
  { slug: 'atendimentos.criar', column: 'user_modulo_03', position: 2, minimum: 2 },
  { slug: 'atendimentos.editar', column: 'user_modulo_03', position: 2, minimum: 3 },
  { slug: 'atendimentos.executar', column: 'user_modulo_03', position: 3, minimum: 2 },
  { slug: 'atendimentos.colocar_espera', column: 'user_modulo_03', position: 4, minimum: 2 },
  { slug: 'atendimentos.recusar', column: 'user_modulo_03', position: 5, minimum: 2 },
  { slug: 'atendimentos.editar_terceiros', column: 'user_modulo_03', position: 6, minimum: 2 },
  { slug: 'atendimentos.radio', column: 'user_modulo_03', position: 7, minimum: 1 },

  { slug: 'devops.atendimentos.visualizar', column: 'user_modulo_05', position: 1, minimum: 1 },
  { slug: 'devops.atendimentos.criar', column: 'user_modulo_05', position: 2, minimum: 2 },
  { slug: 'devops.atendimentos.editar', column: 'user_modulo_05', position: 2, minimum: 3 },
  { slug: 'devops.atendimentos.executar', column: 'user_modulo_05', position: 3, minimum: 2 },
  { slug: 'devops.atendimentos.colocar_espera', column: 'user_modulo_05', position: 4, minimum: 2 },
  { slug: 'devops.atendimentos.recusar', column: 'user_modulo_05', position: 5, minimum: 2 },
  { slug: 'devops.atendimentos.editar_terceiros', column: 'user_modulo_05', position: 6, minimum: 2 },

  { slug: 'cadastros.financeiro.visualizar', column: 'user_modulo_07', position: 1, minimum: 1 },
  { slug: 'cadastros.financeiro.gerenciar', column: 'user_modulo_07', position: 1, minimum: 1 },

  { slug: 'atendimentos.auditar', column: 'user_modulo_08', position: 1, minimum: 1 },
  { slug: 'marketing.atendimentos.visualizar', column: 'user_modulo_08', position: 1, minimum: 1 },
  { slug: 'marketing.atendimentos.criar', column: 'user_modulo_08', position: 2, minimum: 2 },
  { slug: 'marketing.atendimentos.editar', column: 'user_modulo_08', position: 2, minimum: 3 },
  { slug: 'marketing.atendimentos.executar', column: 'user_modulo_08', position: 3, minimum: 2 },
  { slug: 'marketing.atendimentos.colocar_espera', column: 'user_modulo_08', position: 4, minimum: 2 },
  { slug: 'marketing.atendimentos.recusar', column: 'user_modulo_08', position: 5, minimum: 2 },
  { slug: 'marketing.atendimentos.editar_terceiros', column: 'user_modulo_08', position: 6, minimum: 2 },
  { slug: 'catalogos.ti.visualizar', column: 'user_modulo_08', position: 5, values: [1, 2, 5, 6] },
  { slug: 'catalogos.ti.editar', column: 'user_modulo_08', position: 5, values: [2, 6] },
  { slug: 'catalogos.devops.visualizar', column: 'user_modulo_08', position: 5, values: [3, 4, 5, 6] },
  { slug: 'catalogos.devops.editar', column: 'user_modulo_08', position: 5, values: [4, 6] },

  { slug: 'logistica.rd.visualizar', column: 'user_modulo_09', position: 1, minimum: 1 },
  { slug: 'logistica.rd.gerenciar', column: 'user_modulo_09', position: 1, minimum: 1 },
  { slug: 'logistica.agenda.visualizar', column: 'user_modulo_09', position: 2, minimum: 1 },
  { slug: 'logistica.agenda.gerenciar', column: 'user_modulo_09', position: 2, minimum: 2 },
  { slug: 'logistica.rd.admin.visualizar', column: 'user_modulo_09', position: 3, minimum: 2 },
  { slug: 'logistica.rd.admin.gerenciar', column: 'user_modulo_09', position: 3, minimum: 2 },
  { slug: 'logistica.rd.aprovar', column: 'user_modulo_09', position: 3, minimum: 2 },
  { slug: 'logistica.rd.pagar', column: 'user_modulo_09', position: 3, minimum: 3 },
  { slug: 'logistica.extratos.visualizar', column: 'user_modulo_09', position: 10, minimum: 1 },
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
): Promise<{ migratedGrants: number }> {
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

  return { migratedGrants };
}

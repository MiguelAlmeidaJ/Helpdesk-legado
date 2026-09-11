import { config } from 'dotenv';
import path from 'node:path';
import { createNivel3Client } from '../index';

config({ path: path.resolve(process.cwd(), '../../.env') });

const CREATE_NAVIGATION_SECTIONS = `
CREATE TABLE IF NOT EXISTS navigation_sections (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(100) NOT NULL,
  label VARCHAR(150) NOT NULL,
  short_label VARCHAR(20) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_navigation_sections_slug (slug),
  KEY idx_navigation_sections_order (is_active, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const CREATE_NAVIGATION_ITEMS = `
CREATE TABLE IF NOT EXISTS navigation_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  section_id INT UNSIGNED NOT NULL,
  slug VARCHAR(120) NOT NULL,
  label VARCHAR(160) NOT NULL,
  href VARCHAR(500) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'planned',
  visibility_condition LONGTEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_navigation_items_slug (slug),
  KEY idx_navigation_items_section_order (section_id, is_active, sort_order, id),
  CONSTRAINT fk_navigation_items_section
    FOREIGN KEY (section_id)
    REFERENCES navigation_sections(id)
    ON DELETE CASCADE
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

type SeedItem = {
  slug: string;
  label: string;
  href?: string;
  status: 'available' | 'planned';
  visibilityCondition?: Record<string, string[]>;
};

type SeedSection = {
  slug: string;
  label: string;
  shortLabel: string;
  items: SeedItem[];
};

const CATALOG_READ = {
  anyPermissions: [
    'catalog.ti.read',
    'catalog.ti.manage',
    'catalog.devops.read',
    'catalog.devops.manage',
  ],
};

const NAVIGATION_SEED: SeedSection[] = [
  {
    slug: 'primary',
    label: 'Principal',
    shortLabel: 'IN',
    items: [
      { slug: 'dashboard', label: 'Dashboard', href: '/dashboard', status: 'available' },
    ],
  },
  {
    slug: 'tickets',
    label: 'Atendimentos',
    shortLabel: 'AT',
    items: [
      { slug: 'tickets-list', label: 'Lista de Atendimentos', href: '/tickets', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'tickets-recurrences', label: 'Recorrências', status: 'planned' },
      { slug: 'tickets-availability', label: 'Disponibilidade Técnica', href: '/tickets/availability', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'tickets-timeline', label: 'Timeline', href: '/tickets/timeline', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'tickets-new', label: 'Novo Atendimento', href: '/tickets/new', status: 'available', visibilityCondition: { anyPermissions: ['tickets.create'] } },
    ],
  },
  {
    slug: 'devops',
    label: 'DevOps',
    shortLabel: 'DO',
    items: [
      { slug: 'devops-projects', label: 'Lista de Projetos', href: '/tickets/devops/projects', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'devops-tasks', label: 'Lista de Tarefas', href: '/tickets/devops', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'devops-project-new', label: 'Novo Projeto', href: '/tickets/devops/projects/new', status: 'available', visibilityCondition: { anyPermissions: ['tickets.create'] } },
      { slug: 'devops-task-new', label: 'Nova Tarefa', status: 'planned' },
    ],
  },
  {
    slug: 'marketing',
    label: 'Marketing',
    shortLabel: 'MK',
    items: [
      { slug: 'marketing-tasks', label: 'Lista de Tarefas', href: '/tickets/marketing', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'marketing-availability', label: 'Disponibilidade Técnica', status: 'planned' },
      { slug: 'marketing-task-new', label: 'Criar Nova Tarefa', status: 'planned' },
    ],
  },
  {
    slug: 'logistics',
    label: 'Logística',
    shortLabel: 'LG',
    items: [
      { slug: 'vehicles-agenda', label: 'Agenda Veículos', href: '/logistics/vehicles/agenda', status: 'available', visibilityCondition: { anyPermissions: ['logistics.vehicle-agenda.read', 'logistics.vehicle-agenda.manage'] } },
      { slug: 'rd', label: 'RD', href: '/logistics/expenses', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.read', 'logistics.expenses.manage'] } },
      { slug: 'rd-management', label: 'Gestão RDs', href: '/logistics/expenses/admin', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.admin.read', 'logistics.expenses.admin.manage'] } },
      { slug: 'rd-comparison', label: 'Análise Comparativa RDs', href: '/logistics/expenses/admin/analysis', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.admin.read', 'logistics.expenses.admin.manage'] } },
      { slug: 'rd-report', label: 'Relatório RDs', href: '/logistics/expenses/admin/report', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.admin.read', 'logistics.expenses.admin.manage'] } },
      { slug: 'rd-data', label: 'Cadastro Dados RD', href: '/logistics/expenses/manage', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.manage'] } },
      { slug: 'rd-approvals', label: 'Aprovação RDs', href: '/logistics/expenses/admin/approvals', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.approve'] } },
      { slug: 'rd-payments', label: 'Pagamento RDs', href: '/logistics/expenses/admin/payments', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.pay'] } },
      { slug: 'receivables-accrual', label: 'Contas a Receber - Competência', status: 'planned' },
      { slug: 'receivables-cashflow', label: 'Contas a Receber - Fluxo', status: 'planned' },
      { slug: 'payables', label: 'Contas a Pagar', status: 'planned' },
      { slug: 'entries', label: 'Lançamentos', status: 'planned' },
      { slug: 'recurring', label: 'Recorrentes', status: 'planned' },
      { slug: 'accounting', label: 'Contabilidade', status: 'planned' },
    ],
  },
  {
    slug: 'reports',
    label: 'Relatórios',
    shortLabel: 'RL',
    items: [
      { slug: 'report-client-total', label: 'Atd. total por Cliente', href: '/reports/tickets/by-client', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'report-client-daily', label: 'Atd. diário por Cliente', status: 'planned' },
      { slug: 'report-requester', label: 'Atd. por Solicitante', status: 'planned' },
      { slug: 'report-tech-total', label: 'Atd. total por Técnico', href: '/reports/tickets/by-technician', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'report-tech-daily', label: 'Atd. diário por Técnico', status: 'planned' },
      { slug: 'report-category-total', label: 'Atd. total por Categoria', href: '/reports/tickets/by-category', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'report-average-time', label: 'Tempo médio para Atendimento', href: '/reports/tickets/workload', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'report-client-analytic', label: 'Atd. Analítico por Cliente', href: '/reports/tickets/analytics?source=tickets', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'report-task-analytic', label: 'Atd. Analítico por Tarefa', href: '/reports/tickets/analytics?source=tasks', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'report-unified', label: 'Relatório Unificado', href: '/reports/tickets/analytics?source=unified', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'report-it-only', label: 'Relatório Somente TI', href: '/reports/tickets/analytics?source=tickets', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'report-improvements', label: 'Analítico de Melhorias', href: '/reports/tickets/analytics?source=improvements', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'report-service-time', label: 'Tempo de Atendimento', href: '/reports/tickets/time', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'report-pdf', label: 'Gerar PDF', href: '/reports/archive', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
    ],
  },
  {
    slug: 'registrations',
    label: 'Cadastros',
    shortLabel: 'CD',
    items: [
      { slug: 'users', label: 'Usuários', href: '/users', status: 'available', visibilityCondition: { anyPermissions: ['users.read', 'users.edit', 'users.manage-access'] } },
      { slug: 'clients', label: 'Clientes', status: 'planned' },
      { slug: 'categories', label: 'Categorias', status: 'planned' },
      { slug: 'catalogs', label: 'Catálogos', href: '/catalog', status: 'available', visibilityCondition: CATALOG_READ },
      { slug: 'catalog-check', label: 'Verificação de Catálogos', href: '/catalog/check', status: 'available', visibilityCondition: CATALOG_READ },
      { slug: 'cost-centers', label: 'Centros de Custo', status: 'planned' },
      { slug: 'accounting-classification', label: 'Classificação Contábil', status: 'planned' },
      { slug: 'adjustment-indexes', label: 'Índices de Reajuste', status: 'planned' },
      { slug: 'payment-methods', label: 'Formas de Pagamento', status: 'planned' },
      { slug: 'expense-types', label: 'Tipo de Despesa', status: 'planned' },
      { slug: 'service-types', label: 'Tipo de Serviço', status: 'planned' },
      { slug: 'fee-types', label: 'Tipo Taxas', status: 'planned' },
    ],
  },
  {
    slug: 'standalone',
    label: 'Outros',
    shortLabel: 'OU',
    items: [
      { slug: 'radio', label: 'Rádio', status: 'planned' },
      { slug: 'statements', label: 'Extratos', status: 'planned' },
    ],
  },
];

type SectionRow = { id: number; slug: string };

async function seedNavigation(db: ReturnType<typeof createNivel3Client>) {
  for (const [sectionIndex, section] of NAVIGATION_SEED.entries()) {
    await db.$executeRaw`
      INSERT IGNORE INTO navigation_sections (
        slug, label, short_label, sort_order, is_active, created_at, updated_at
      ) VALUES (
        ${section.slug}, ${section.label}, ${section.shortLabel}, ${sectionIndex * 10}, 1, NOW(), NOW()
      )
    `;
  }

  const rows = await db.$queryRaw<SectionRow[]>`
    SELECT id, slug FROM navigation_sections
  `;
  const sectionIds = new Map(rows.map((row) => [row.slug, row.id]));

  for (const section of NAVIGATION_SEED) {
    const sectionId = sectionIds.get(section.slug);
    if (!sectionId) throw new Error(`Seção de navegação ${section.slug} não encontrada.`);

    for (const [itemIndex, item] of section.items.entries()) {
      const visibilityCondition = item.visibilityCondition
        ? JSON.stringify(item.visibilityCondition)
        : null;

      await db.$executeRaw`
        INSERT IGNORE INTO navigation_items (
          section_id,
          slug,
          label,
          href,
          status,
          visibility_condition,
          sort_order,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          ${sectionId},
          ${item.slug},
          ${item.label},
          ${item.href ?? null},
          ${item.status},
          ${visibilityCondition},
          ${itemIndex * 10},
          1,
          NOW(),
          NOW()
        )
      `;
    }
  }
}

async function main() {
  const db = createNivel3Client();

  try {
    await db.$executeRawUnsafe(CREATE_NAVIGATION_SECTIONS);
    await db.$executeRawUnsafe(CREATE_NAVIGATION_ITEMS);
    await seedNavigation(db);

    console.log('Navegação configurável criada/verificada.');
    console.log('  navigation_sections: OK');
    console.log('  navigation_items: OK');
    console.log('  menu inicial: importado de forma idempotente');
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

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

export const DEFAULT_NAVIGATION: SeedSection[] = [
  {
    slug: 'primary',
    label: 'Principal',
    shortLabel: 'IN',
    items: [
      { slug: 'dashboard', label: 'Painel', href: '/painel', status: 'available' },
    ],
  },
  {
    slug: 'tickets',
    label: 'Atendimentos',
    shortLabel: 'AT',
    items: [
      { slug: 'tickets-list', label: 'Lista de Atendimentos', href: '/atendimentos', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'tickets-recurrences', label: 'Recorrências', href: '/atendimentos/recorrencias', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'tickets-availability', label: 'Disponibilidade Técnica', href: '/atendimentos/disponibilidade', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'tickets-timeline', label: 'Linha do tempo', href: '/atendimentos/linha-do-tempo', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'tickets-new', label: 'Novo Atendimento', href: '/atendimentos/novo', status: 'available', visibilityCondition: { anyPermissions: ['tickets.create'] } },
    ],
  },
  {
    slug: 'devops',
    label: 'DevOps',
    shortLabel: 'DO',
    items: [
      { slug: 'devops-projects', label: 'Lista de Projetos', href: '/atendimentos/devops/projetos', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'devops-tasks', label: 'Lista de Tarefas', href: '/atendimentos/devops', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'devops-project-new', label: 'Novo Projeto', href: '/atendimentos/devops/projetos/novo', status: 'available', visibilityCondition: { anyPermissions: ['tickets.create'] } },
      { slug: 'devops-task-new', label: 'Nova Tarefa', href: '/atendimentos/devops/nova-tarefa', status: 'available', visibilityCondition: { anyPermissions: ['tickets.create'] } },
    ],
  },
  {
    slug: 'marketing',
    label: 'Marketing',
    shortLabel: 'MK',
    items: [
      { slug: 'marketing-tasks', label: 'Lista de Tarefas', href: '/atendimentos/marketing', status: 'available', visibilityCondition: { anyPermissions: ['tickets.read'] } },
      { slug: 'marketing-task-new', label: 'Nova Tarefa', href: '/atendimentos/marketing/nova-tarefa', status: 'available', visibilityCondition: { anyPermissions: ['tickets.create'] } },
    ],
  },
  {
    slug: 'logistics',
    label: 'Logística',
    shortLabel: 'LG',
    items: [
      { slug: 'vehicles-agenda', label: 'Agenda Veículos', href: '/logistica/veiculos/agenda', status: 'available', visibilityCondition: { anyPermissions: ['logistics.vehicle-agenda.read', 'logistics.vehicle-agenda.manage'] } },
      { slug: 'rd', label: 'RD', href: '/logistica/despesas', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.read', 'logistics.expenses.manage'] } },
      { slug: 'rd-management', label: 'Gestão RDs', href: '/logistica/despesas/administracao', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.admin.read', 'logistics.expenses.admin.manage'] } },
      { slug: 'rd-comparison', label: 'Análise Comparativa RDs', href: '/logistica/despesas/administracao/analise', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.admin.read', 'logistics.expenses.admin.manage'] } },
      { slug: 'rd-report', label: 'Relatório RDs', href: '/logistica/despesas/administracao/relatorio', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.admin.read', 'logistics.expenses.admin.manage'] } },
      { slug: 'rd-data', label: 'Cadastro Dados RD', href: '/logistica/despesas/cadastro', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.manage'] } },
      { slug: 'rd-approvals', label: 'Aprovação RDs', href: '/logistica/despesas/administracao/aprovacoes', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.approve'] } },
      { slug: 'rd-payments', label: 'Pagamento RDs', href: '/logistica/despesas/administracao/pagamentos', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.pay'] } },
      { slug: 'receivables-accrual', label: 'Contas a Receber - Competência', href: '/logistica/financeiro/contas-a-receber-competencia', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.admin.read', 'logistics.expenses.admin.manage'] } },
      { slug: 'receivables-cashflow', label: 'Contas a Receber - Fluxo', href: '/logistica/financeiro/contas-a-receber-fluxo', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.admin.read', 'logistics.expenses.admin.manage'] } },
      { slug: 'payables', label: 'Contas a Pagar', href: '/logistica/financeiro/contas-a-pagar', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.admin.read', 'logistics.expenses.admin.manage'] } },
      { slug: 'entries', label: 'Lançamentos', href: '/logistica/financeiro/lancamentos', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.admin.read', 'logistics.expenses.admin.manage'] } },
      { slug: 'recurring', label: 'Recorrentes', href: '/logistica/financeiro/recorrentes', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.admin.read', 'logistics.expenses.admin.manage'] } },
      { slug: 'accounting', label: 'Contabilidade', href: '/logistica/financeiro/contabilidade', status: 'available', visibilityCondition: { anyPermissions: ['logistics.expenses.admin.read', 'logistics.expenses.admin.manage'] } },
    ],
  },
  {
    slug: 'reports',
    label: 'Relatórios',
    shortLabel: 'RL',
    items: [
      { slug: 'report-client-total', label: 'Atd. total por Cliente', href: '/relatorios/atendimentos/por-cliente', status: 'available', visibilityCondition: { anyPermissions: ['tickets.audit'] } },
      { slug: 'report-client-daily', label: 'Atd. diário por Cliente', href: '/relatorios/atendimentos/diario-por-cliente', status: 'available', visibilityCondition: { anyPermissions: ['tickets.audit'] } },
      { slug: 'report-requester', label: 'Atd. por Solicitante', href: '/relatorios/atendimentos/por-solicitante', status: 'available', visibilityCondition: { anyPermissions: ['tickets.audit'] } },
      { slug: 'report-tech-total', label: 'Atd. total por Técnico', href: '/relatorios/atendimentos/por-tecnico', status: 'available', visibilityCondition: { anyPermissions: ['tickets.audit'] } },
      { slug: 'report-tech-daily', label: 'Atd. diário por Técnico', href: '/relatorios/atendimentos/diario-por-tecnico', status: 'available', visibilityCondition: { anyPermissions: ['tickets.audit'] } },
      { slug: 'report-category-total', label: 'Atd. total por Categoria', href: '/relatorios/atendimentos/por-categoria', status: 'available', visibilityCondition: { anyPermissions: ['tickets.audit'] } },
      { slug: 'report-average-time', label: 'Tempo médio para Atendimento', href: '/relatorios/atendimentos/tempo-medio', status: 'available', visibilityCondition: { anyPermissions: ['tickets.audit'] } },
      { slug: 'report-client-analytic', label: 'Atd. Analítico por Cliente', href: '/relatorios/atendimentos/analitico?source=tickets', status: 'available', visibilityCondition: { anyPermissions: ['tickets.audit'] } },
      { slug: 'report-task-analytic', label: 'Atd. Analítico por Tarefa', href: '/relatorios/atendimentos/analitico?source=tasks', status: 'available', visibilityCondition: { anyPermissions: ['tickets.audit'] } },
      { slug: 'report-unified', label: 'Relatório Unificado', href: '/relatorios/atendimentos/analitico?source=unified', status: 'available', visibilityCondition: { anyPermissions: ['tickets.audit'] } },
      { slug: 'report-it-only', label: 'Relatório Somente TI', href: '/relatorios/atendimentos/analitico?source=tickets', status: 'available', visibilityCondition: { anyPermissions: ['tickets.audit'] } },
      { slug: 'report-improvements', label: 'Analítico de Melhorias', href: '/relatorios/atendimentos/analitico?source=improvements', status: 'available', visibilityCondition: { anyPermissions: ['tickets.audit'] } },
      { slug: 'report-service-time', label: 'Tempo de Atendimento', href: '/relatorios/atendimentos/tempo', status: 'available', visibilityCondition: { anyPermissions: ['tickets.audit'] } },
      { slug: 'report-pdf', label: 'Gerar PDF', href: '/relatorios/arquivos', status: 'available', visibilityCondition: { anyPermissions: ['tickets.audit'] } },
    ],
  },
  {
    slug: 'registrations',
    label: 'Cadastros',
    shortLabel: 'CD',
    items: [
      { slug: 'users', label: 'Usuários', href: '/usuarios', status: 'available', visibilityCondition: { anyPermissions: ['users.read', 'users.edit', 'users.manage-access'] } },
      { slug: 'clients', label: 'Clientes', href: '/cadastros/clientes', status: 'available', visibilityCondition: { anyPermissions: ['registrations.clients.read', 'registrations.clients.create', 'registrations.clients.edit'] } },
      { slug: 'categories', label: 'Categorias', href: '/cadastros/categorias', status: 'available', visibilityCondition: { anyPermissions: ['registrations.categories.read', 'registrations.categories.create', 'registrations.categories.edit'] } },
      { slug: 'catalogs', label: 'Catálogos', href: '/catalogos', status: 'available', visibilityCondition: CATALOG_READ },
      { slug: 'catalog-check', label: 'Verificação de Catálogos', href: '/catalogos/verificacao', status: 'available', visibilityCondition: CATALOG_READ },
      { slug: 'cost-centers', label: 'Centros de Custo', href: '/cadastros/centros-de-custo', status: 'available', visibilityCondition: { anyPermissions: ['registrations.finance.read', 'registrations.finance.manage'] } },
      { slug: 'accounting-classification', label: 'Classificação Contábil', href: '/cadastros/classificacao-contabil', status: 'available', visibilityCondition: { anyPermissions: ['registrations.finance.read', 'registrations.finance.manage'] } },
      { slug: 'adjustment-indexes', label: 'Índices de Reajuste', href: '/cadastros/indices-de-reajuste', status: 'available', visibilityCondition: { anyPermissions: ['registrations.finance.read', 'registrations.finance.manage'] } },
      { slug: 'payment-methods', label: 'Formas de Pagamento', href: '/cadastros/formas-de-pagamento', status: 'available', visibilityCondition: { anyPermissions: ['registrations.finance.read', 'registrations.finance.manage'] } },
      { slug: 'expense-types', label: 'Tipo de Despesa', href: '/cadastros/tipos-de-despesa', status: 'available', visibilityCondition: { anyPermissions: ['registrations.finance.read', 'registrations.finance.manage'] } },
      { slug: 'service-types', label: 'Tipo de Serviço', href: '/cadastros/tipos-de-servico', status: 'available', visibilityCondition: { anyPermissions: ['registrations.finance.read', 'registrations.finance.manage'] } },
      { slug: 'fee-types', label: 'Tipo Taxas', href: '/cadastros/tipos-de-taxa', status: 'available', visibilityCondition: { anyPermissions: ['registrations.finance.read', 'registrations.finance.manage'] } },
    ],
  },
  {
    slug: 'standalone',
    label: 'Outros',
    shortLabel: 'OU',
    items: [
      { slug: 'radio', label: 'Rádio', href: '/radio', status: 'available' },
      { slug: 'statements', label: 'Extratos', href: '/extratos', status: 'available', visibilityCondition: { anyPermissions: ['logistics.statements.read'] } },
    ],
  },
  {
    slug: 'administration',
    label: 'Administração',
    shortLabel: 'AD',
    items: [
      {
        slug: 'access-management',
        label: 'Permissões',
        href: '/administracao/permissoes',
        status: 'available',
        visibilityCondition: { anyPermissions: ['system.admin', 'users.manage-access'] },
      },
      {
        slug: 'navigation-admin',
        label: 'Navegação',
        href: '/administracao/navegacao',
        status: 'available',
        visibilityCondition: { anyPermissions: ['system.admin'] },
      },
      {
        slug: 'ticket-sla-settings',
        label: 'SLA de Atendimentos',
        href: '/administracao/sla-atendimentos',
        status: 'available',
        visibilityCondition: { anyPermissions: ['system.admin'] },
      },
      {
        slug: 'maintenance',
        label: 'Manutenção',
        href: '/administracao/manutencao',
        status: 'available',
        visibilityCondition: { anyPermissions: ['system.admin'] },
      },
    ],
  },
];

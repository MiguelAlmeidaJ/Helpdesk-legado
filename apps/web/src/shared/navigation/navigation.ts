export type NavigationItemStatus = 'available' | 'planned';

export interface NavigationItem {
  id: string;
  label: string;
  href?: string;
  status: NavigationItemStatus;
}

export interface NavigationSection {
  id: string;
  label: string;
  shortLabel: string;
  items: NavigationItem[];
}

export const DASHBOARD_NAVIGATION_ITEM: NavigationItem = {
  id: 'dashboard',
  label: 'Dashboard',
  href: '/dashboard',
  status: 'available',
};

export const APP_NAVIGATION_SECTIONS: NavigationSection[] = [
  {
    id: 'tickets',
    label: 'Atendimentos',
    shortLabel: 'AT',
    items: [
      {
        id: 'tickets-list',
        label: 'Lista de Atendimentos',
        href: '/tickets',
        status: 'available',
      },
      { id: 'tickets-recurrences', label: 'Recorrências', status: 'planned' },
      {
        id: 'tickets-availability',
        label: 'Disponibilidade Técnica',
        status: 'planned',
      },
      { id: 'tickets-timeline', label: 'Timeline', status: 'planned' },
      { id: 'tickets-new', label: 'Novo Atendimento', href: '/tickets/new', status: 'available' },
    ],
  },
  {
    id: 'devops',
    label: 'DevOps',
    shortLabel: 'DO',
    items: [
      { id: 'devops-projects', label: 'Lista de Projetos', status: 'planned' },
      { id: 'devops-tasks', label: 'Lista de Tarefas', status: 'planned' },
      { id: 'devops-project-new', label: 'Novo Projeto', status: 'planned' },
      { id: 'devops-task-new', label: 'Nova Tarefa', status: 'planned' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    shortLabel: 'MK',
    items: [
      { id: 'marketing-tasks', label: 'Lista de Tarefas', status: 'planned' },
      {
        id: 'marketing-availability',
        label: 'Disponibilidade Técnica',
        status: 'planned',
      },
      {
        id: 'marketing-task-new',
        label: 'Criar Nova Tarefa',
        status: 'planned',
      },
    ],
  },
  {
    id: 'logistics',
    label: 'Logística',
    shortLabel: 'LG',
    items: [
      { id: 'vehicles-agenda', label: 'Agenda Veículos', status: 'planned' },
      { id: 'rd', label: 'RD', status: 'planned' },
      { id: 'rd-management', label: 'Gestão RDs', status: 'planned' },
      {
        id: 'rd-comparison',
        label: 'Análise Comparativa RDs',
        status: 'planned',
      },
      { id: 'rd-report', label: 'Relatório RDs', status: 'planned' },
      { id: 'rd-data', label: 'Cadastro Dados RD', status: 'planned' },
      {
        id: 'receivables-accrual',
        label: 'Contas a Receber - Competência',
        status: 'planned',
      },
      {
        id: 'receivables-cashflow',
        label: 'Contas a Receber - Fluxo',
        status: 'planned',
      },
      { id: 'payables', label: 'Contas a Pagar', status: 'planned' },
      { id: 'entries', label: 'Lançamentos', status: 'planned' },
      { id: 'recurring', label: 'Recorrentes', status: 'planned' },
      { id: 'accounting', label: 'Contabilidade', status: 'planned' },
    ],
  },
  {
    id: 'reports',
    label: 'Relatórios',
    shortLabel: 'RL',
    items: [
      { id: 'report-client-total', label: 'Atd. total por Cliente', status: 'planned' },
      { id: 'report-client-daily', label: 'Atd. diário por Cliente', status: 'planned' },
      { id: 'report-requester', label: 'Atd. por Solicitante', status: 'planned' },
      { id: 'report-tech-total', label: 'Atd. total por Técnico', status: 'planned' },
      { id: 'report-tech-daily', label: 'Atd. diário por Técnico', status: 'planned' },
      { id: 'report-category-total', label: 'Atd. total por Categoria', status: 'planned' },
      { id: 'report-average-time', label: 'Tempo médio para Atendimento', status: 'planned' },
      { id: 'report-client-analytic', label: 'Atd. Analítico por Cliente', status: 'planned' },
      { id: 'report-task-analytic', label: 'Atd. Analítico por Tarefa', status: 'planned' },
      { id: 'report-unified', label: 'Relatório Unificado', status: 'planned' },
      { id: 'report-it-only', label: 'Relatório Somente TI', status: 'planned' },
      { id: 'report-service-time', label: 'Tempo de Atendimento', status: 'planned' },
      { id: 'report-pdf', label: 'Gerar PDF', status: 'planned' },
    ],
  },
  {
    id: 'registrations',
    label: 'Cadastros',
    shortLabel: 'CD',
    items: [
      { id: 'users', label: 'Usuários', href: '/users', status: 'available' },
      { id: 'clients', label: 'Clientes', status: 'planned' },
      { id: 'categories', label: 'Categorias', status: 'planned' },
      { id: 'catalogs', label: 'Catálogos', status: 'planned' },
      { id: 'catalog-check', label: 'Verificação de Catálogos', status: 'planned' },
      { id: 'cost-centers', label: 'Centros de Custo', status: 'planned' },
      { id: 'accounting-classification', label: 'Classificação Contábil', status: 'planned' },
      { id: 'adjustment-indexes', label: 'Índices de Reajuste', status: 'planned' },
      { id: 'payment-methods', label: 'Formas de Pagamento', status: 'planned' },
      { id: 'expense-types', label: 'Tipo de Despesa', status: 'planned' },
      { id: 'service-types', label: 'Tipo de Serviço', status: 'planned' },
      { id: 'fee-types', label: 'Tipo Taxas', status: 'planned' },
    ],
  },
];

export const APP_NAVIGATION_STANDALONE: NavigationItem[] = [
  { id: 'radio', label: 'Rádio', status: 'planned' },
  { id: 'statements', label: 'Extratos', status: 'planned' },
];

export function navigationTotals() {
  const items = [
    DASHBOARD_NAVIGATION_ITEM,
    ...APP_NAVIGATION_SECTIONS.flatMap((section) => section.items),
    ...APP_NAVIGATION_STANDALONE,
  ];

  return {
    total: items.length,
    available: items.filter((item) => item.status === 'available').length,
    planned: items.filter((item) => item.status === 'planned').length,
  };
}

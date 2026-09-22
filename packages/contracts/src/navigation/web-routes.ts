// Browser routes only. API endpoints and permission identifiers stay stable.
// More specific prefixes must precede their parents.
export const WEB_ROUTE_TRANSLATIONS = [
  ['/tickets/availability/waiting-report', '/atendimentos/disponibilidade/relatorio-espera'],
  ['/tickets/availability/legacy', '/atendimentos/disponibilidade/antiga'],
  ['/tickets/devops/new', '/atendimentos/devops/nova-tarefa'],
  ['/tickets/marketing/new', '/atendimentos/marketing/nova-tarefa'],
  ['/tickets/marketing/availability', '/atendimentos/marketing/disponibilidade'],
  ['/tickets/devops/projects/new', '/atendimentos/devops/projetos/novo'],
  ['/tickets/devops/projects', '/atendimentos/devops/projetos'],
  ['/tickets/devops/reports/tasks', '/atendimentos/devops/relatorios/tarefas'],
  ['/tickets/marketing/reports/tasks', '/atendimentos/marketing/relatorios/tarefas'],
  ['/tickets/recurrences', '/atendimentos/recorrencias'],
  ['/tickets/availability', '/atendimentos/disponibilidade'],
  ['/tickets/timeline', '/atendimentos/linha-do-tempo'],
  ['/tickets/new', '/atendimentos/novo'],
  ['/tickets', '/atendimentos'],
  ['/reports/tickets/client-daily', '/relatorios/atendimentos/diario-por-cliente'],
  ['/reports/tickets/requester', '/relatorios/atendimentos/por-solicitante'],
  ['/reports/tickets/technician-daily', '/relatorios/atendimentos/diario-por-tecnico'],
  ['/reports/tickets/by-client', '/relatorios/atendimentos/por-cliente'],
  ['/reports/tickets/by-technician', '/relatorios/atendimentos/por-tecnico'],
  ['/reports/tickets/by-category', '/relatorios/atendimentos/por-categoria'],
  ['/reports/tickets/workload', '/relatorios/atendimentos/tempo-medio'],
  ['/reports/tickets/analytics', '/relatorios/atendimentos/analitico'],
  ['/reports/tickets/time', '/relatorios/atendimentos/tempo'],
  ['/reports/archive', '/relatorios/arquivos'],
  ['/logistics/finance/receivables-accrual', '/logistica/financeiro/contas-a-receber-competencia'],
  ['/logistics/finance/receivables-cashflow', '/logistica/financeiro/contas-a-receber-fluxo'],
  ['/logistics/finance/payables', '/logistica/financeiro/contas-a-pagar'],
  ['/logistics/finance/entries', '/logistica/financeiro/lancamentos'],
  ['/logistics/finance/recurring', '/logistica/financeiro/recorrentes'],
  ['/logistics/finance/accounting', '/logistica/financeiro/contabilidade'],
  ['/logistics/finance/statements', '/extratos'],
  ['/logistics/vehicles/agenda', '/logistica/veiculos/agenda'],
  ['/logistics/expenses/admin/approvals/attachments', '/logistica/despesas/administracao/aprovacoes/anexos'],
  ['/logistics/expenses/admin/approvals', '/logistica/despesas/administracao/aprovacoes'],
  ['/logistics/expenses/admin/payments', '/logistica/despesas/administracao/pagamentos'],
  ['/logistics/expenses/admin/report', '/logistica/despesas/administracao/relatorio'],
  ['/logistics/expenses/admin/analysis', '/logistica/despesas/administracao/analise'],
  ['/logistics/expenses/admin', '/logistica/despesas/administracao'],
  ['/logistics/expenses/attachments', '/logistica/despesas/anexos'],
  ['/logistics/expenses/manage', '/logistica/despesas/cadastro'],
  ['/logistics/expenses', '/logistica/despesas'],
  ['/registrations', '/cadastros'],
  ['/catalog/check', '/catalogos/verificacao'],
  ['/catalog', '/catalogos'],
  ['/users', '/usuarios'],
  ['/dashboard', '/painel'],
  ['/admin/ticket-sla', '/administracao/sla-atendimentos'],
  ['/admin/navigation', '/administracao/navegacao'],
] as const;

export function portugueseWebHref(href: string): string {
  for (const [source, destination] of WEB_ROUTE_TRANSLATIONS) {
    if (
      href === source ||
      href.startsWith(`${source}/`) ||
      href.startsWith(`${source}?`) ||
      href.startsWith(`${source}#`)
    ) {
      return destination + href.slice(source.length);
    }
  }
  return href;
}

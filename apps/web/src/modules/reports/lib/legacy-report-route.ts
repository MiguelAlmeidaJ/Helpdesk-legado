const DESTINATIONS: Record<string, { path: string; source?: string }> = {
  'atd_total_por_cliente.php': { path: '/reports/tickets/by-client' },
  'atd_total_por_tecnico.php': { path: '/reports/tickets/by-technician' },
  'atd_total_por_categoria.php': { path: '/reports/tickets/by-category' },
  'atd_abertos_por_tecnico.php': { path: '/reports/tickets/workload' },
  'atd_tempo_por_tecnico.php': { path: '/reports/tickets/workload' },
  'atd_analitico_por_cliente.php': { path: '/reports/tickets/analytics', source: 'tickets' },
  'atd_analitico_por_tarefa.php': { path: '/reports/tickets/analytics', source: 'tasks' },
  'atd_analitico_por_melhoria.php': { path: '/reports/tickets/analytics', source: 'improvements' },
  'rel_Unificado.php': { path: '/reports/tickets/analytics', source: 'unified' },
  'rel_Unificado_Id.php': { path: '/reports/tickets/analytics', source: 'unified' },
  'rel_ti.php': { path: '/reports/tickets/analytics', source: 'tickets' },
  'rel_tempo_atd.php': { path: '/reports/tickets/time' },
  'gerar_pdf.php': { path: '/reports/tickets/analytics', source: 'unified' },
  'relatoriosPDF.php': { path: '/reports/archive' },
};

export function legacyReportDestination(name: string, query: URLSearchParams): string | null {
  if (name === 'gerar_relatorio_pdf.php') name = query.get('pagina') ?? '';
  const destination = DESTINATIONS[name];
  if (!destination) return null;
  const params = new URLSearchParams();
  for (const [oldName, newName] of Object.entries({ data_1: 'startDate', data_2: 'endDate', data_inicio: 'startDate', data_fim: 'endDate', f_clt: 'clientId', f_local: 'locationId', f_nivel: 'level', tecnico: 'technicianId', startDate: 'startDate', endDate: 'endDate', clientId: 'clientId', locationId: 'locationId', level: 'level', technicianId: 'technicianId' })) {
    const value = query.get(oldName);
    if (value) params.set(newName, value);
  }
  if (destination.source) params.set('source', destination.source);
  if (name === 'rel_tempo_atd.php') params.set('source', query.get('f_area') === 'devops' ? 'tasks' : 'tickets');
  return destination.path + (params.size ? `?${params}` : '');
}

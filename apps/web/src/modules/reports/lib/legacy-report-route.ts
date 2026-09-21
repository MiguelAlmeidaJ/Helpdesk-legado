const DESTINATIONS: Record<string, { path: string; source?: string }> = {
  'atd_total_por_cliente.php': { path: '/relatorios/atendimentos/por-cliente' },
  'atd_total_por_tecnico.php': { path: '/relatorios/atendimentos/por-tecnico' },
  'atd_total_por_categoria.php': { path: '/relatorios/atendimentos/por-categoria' },
  'atd_abertos_por_tecnico.php': { path: '/relatorios/atendimentos/tempo-medio' },
  'atd_tempo_por_tecnico.php': { path: '/relatorios/atendimentos/tempo-medio' },
  'atd_analitico_por_cliente.php': { path: '/relatorios/atendimentos/analitico', source: 'tickets' },
  'atd_analitico_por_tarefa.php': { path: '/relatorios/atendimentos/analitico', source: 'tasks' },
  'atd_analitico_por_melhoria.php': { path: '/relatorios/atendimentos/analitico', source: 'improvements' },
  'rel_Unificado.php': { path: '/relatorios/atendimentos/analitico', source: 'unified' },
  'rel_Unificado_Id.php': { path: '/relatorios/atendimentos/analitico', source: 'unified' },
  'rel_ti.php': { path: '/relatorios/atendimentos/analitico', source: 'tickets' },
  'rel_tempo_atd.php': { path: '/relatorios/atendimentos/tempo' },
  'gerar_pdf.php': { path: '/relatorios/atendimentos/analitico', source: 'unified' },
  'relatoriosPDF.php': { path: '/relatorios/arquivos' },
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

'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { CurrentUserResponse, TicketAnalyticsResponse, TicketReportCatalog, TicketReportSource, TechnicianWorkloadResponse } from '@helpdesk/contracts';
import { apiDownload, apiRequest } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { downloadCsv, duration, reportError } from '../lib/report-export';
import styles from './ticket-client-totals-report-screen.module.css';

const SOURCE_LABELS = { tickets: 'Atendimento', tasks: 'Tarefa', improvements: 'Melhoria', unified: 'Unificado' };
const STATUS: Record<number, string> = { 1: 'Aguardando execução', 2: 'Em execução', 3: 'Em espera', 4: 'Concluído', 5: 'Finalizado' };
const TYPES: Record<number, string> = { 1: 'Falha', 2: 'Relacionamento', 3: 'Requisição de serviços', 4: 'Requisição de informação', 5: 'Monitoramento' };
const METHODS: Record<number, string> = { 1: 'Remoto', 2: 'Presencial', 3: 'Remoto — plantão', 4: 'Presencial — plantão' };
const EMPTY_CATALOG: TicketReportCatalog = { clients: [], locations: [], technicians: [] };

export function TicketAnalyticsScreen({ currentUser, mode, initialSource = 'tickets', initialFilters = {} }: {
  currentUser: CurrentUserResponse; mode: 'analytics' | 'workload' | 'time'; initialSource?: TicketReportSource; initialFilters?: Record<string, string>;
}) {
  const [filters, setFilters] = useState({ startDate: '', endDate: '', clientId: '0', locationId: '0', technicianId: '0', level: '0', source: initialSource as string, ...initialFilters });
  const [report, setReport] = useState<TicketAnalyticsResponse | null>(null);
  const [workload, setWorkload] = useState<TechnicianWorkloadResponse | null>(null);
  const [catalog, setCatalog] = useState<TicketReportCatalog>(EMPTY_CATALOG);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const title = mode === 'workload' ? 'Atendimentos abertos por técnico' : mode === 'time' ? 'Tempo de atendimento' : 'Relatório analítico';

  async function load(values: typeof filters) {
    const id = ++requestId.current;
    setLoading(true); setError('');
    try {
      if (mode === 'workload') {
        const response = await apiRequest<TechnicianWorkloadResponse>('reports/tickets/workload');
        if (id === requestId.current) setWorkload(response);
      } else {
        const query = new URLSearchParams(Object.entries(values).filter(([, value]) => value !== ''));
        const response = await apiRequest<TicketAnalyticsResponse>(`reports/tickets/analytics?${query}`);
        if (id === requestId.current) { setReport(response); setFilters(Object.fromEntries(Object.entries(response.filters).map(([key, value]) => [key, String(value)])) as typeof filters); }
      }
    } catch (reason) {
      if (id === requestId.current) { setError(reportError(reason)); setReport(null); setWorkload(null); }
    } finally { if (id === requestId.current) setLoading(false); }
  }

  useEffect(() => {
    void load(filters);
    const interval = mode === 'workload' ? setInterval(() => void load(filters), 60000) : undefined;
    return () => { requestId.current++; if (interval) clearInterval(interval); };
    // Initial request; subsequent filters are submitted explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (mode === 'workload') return;
    let active = true;
    apiRequest<TicketReportCatalog>(`reports/tickets/catalog?clientId=${encodeURIComponent(filters.clientId)}`)
      .then(value => { if (active) setCatalog(value); })
      .catch(reason => { if (active) { setCatalog(EMPTY_CATALOG); setError(reportError(reason)); } });
    return () => { active = false; };
  }, [filters.clientId, mode]);

  function apply(event: FormEvent) { event.preventDefault(); void load(filters); }
  function exportCsv() {
    if (workload) downloadCsv('atendimentos-abertos.csv', [
      ['Técnico', 'Abertos', 'Em espera', 'Vencidos', 'Tempo aberto'],
      ...workload.rows.map(row => [row.technicianName, row.open, row.waiting, row.overdue, duration(row.elapsedSeconds)]),
    ]);
    if (report) downloadCsv(`analitico-${report.filters.startDate}-${report.filters.endDate}.csv`, [
      ['Origem', 'ID', 'Cliente', 'Local', 'Endereço', 'Solicitante', 'Técnico', 'Categoria', 'Subcategoria', 'Item', 'Tipo', 'Nível', 'Forma', 'Status', 'Abertura', 'Fechamento', 'Descrição abertura', 'Descrição fechamento', 'Tempo desde abertura'],
      ...report.rows.map(row => [SOURCE_LABELS[row.source], row.id, row.clientName, row.locationName, row.locationAddress, row.requesterName, row.technicianName, row.categoryName, row.subcategoryName, row.itemName, row.type, row.level, row.method, STATUS[row.status] ?? row.status, row.openedAt, row.closedAt ?? '', row.openingDescription, row.closingDescription, duration(row.elapsedSeconds)]),
    ]);
  }

  const periodLabel = report ? `${report.filters.startDate} a ${report.filters.endDate} · ${SOURCE_LABELS[report.filters.source]} · Nível ${report.filters.level || 'Todos'}` : '';
  return <main className={styles.page}>
    <header className={styles.header}><div className={styles.headerLeft}><AppSidebar /><Link className={styles.brand} href="/dashboard"><strong>Helpdesk</strong><span>Relatórios</span></Link></div><SessionUserMenu user={currentUser} /></header>
    <div className={styles.content}>
      <section className={styles.hero}><div><span className={styles.eyebrow}>Atendimentos</span><h1>{title}</h1><p>{mode === 'workload' ? 'Chamados ativos e tempo acumulado. Atualização a cada 60 segundos.' : 'Consulte os registros por período, cliente, local e técnico.'}</p><p className={styles.printHeading}>{periodLabel}</p></div></section>
      {mode !== 'workload' ? <form className={styles.filters} onSubmit={apply}>
        <label><span>De</span><input type="date" required value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} /></label>
        <label><span>Até</span><input type="date" required value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} /></label>
        <label><span>Origem</span><select value={filters.source} onChange={e => setFilters({ ...filters, source: e.target.value })}>{Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Cliente</span><select value={filters.clientId} onChange={e => setFilters({ ...filters, clientId: e.target.value, locationId: '0' })}><option value="0">Todos</option>{catalog.clients.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label><span>Local</span><select value={filters.locationId} onChange={e => setFilters({ ...filters, locationId: e.target.value })}><option value="0">Todos</option>{catalog.locations.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label><span>Técnico</span><select value={filters.technicianId} onChange={e => setFilters({ ...filters, technicianId: e.target.value })}><option value="0">Todos</option>{catalog.technicians.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label><span>Nível (atendimentos e melhorias)</span><select value={filters.level} onChange={e => setFilters({ ...filters, level: e.target.value })}>{[0, 1, 2, 3, 4, 5].map(level => <option key={level} value={level}>{level || 'Todos'}</option>)}</select></label>
        <div className={styles.actions}><button disabled={loading}>Filtrar</button></div>
      </form> : null}
      <div className={styles.exportActions}><span>{periodLabel}</span><button type="button" disabled={loading} onClick={() => void load(filters)}>Atualizar</button><button type="button" disabled={loading || !!error || (!report && !workload)} onClick={exportCsv}>Exportar CSV</button><button type="button" disabled={loading || !!error || (!report && !workload)} onClick={() => window.print()}>Imprimir / Salvar PDF</button></div>
      {report ? <div className={styles.exportActions}><button type="button" disabled={loading} onClick={() => {
        const query = new URLSearchParams(Object.entries(report.filters).map(([key, value]) => [key, String(value)]));
        setLoading(true);
        apiDownload(`reports/tickets/analytics.pdf?${query}`, 'relatorio.pdf').catch(reason => setError(reportError(reason))).finally(() => setLoading(false));
      }}>Baixar PDF</button></div> : null}
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      {loading ? <p role="status">Carregando relatório…</p> : null}
      {!loading && workload ? <section className={styles.reportCard}><div className={styles.tableWrap}><table><thead><tr><th>Técnico</th><th>Abertos</th><th>Em espera</th><th>Vencidos</th><th>Tempo aberto</th><th>Horas acumuladas</th></tr></thead><tbody>{workload.rows.map(row => <tr key={row.technicianId}><td>{row.technicianName}</td><td>{row.open}</td><td>{row.waiting}</td><td>{row.overdue}</td><td>{duration(row.elapsedSeconds)}</td><td>{(row.elapsedSeconds / 3600).toFixed(2)}</td></tr>)}</tbody></table>{!workload.rows.length ? <p className={styles.empty}>Nenhum registro disponível.</p> : null}</div></section> : null}
      {!loading && report ? <section className={styles.reportCard}><div className={styles.rowHeader}><strong>{report.total} registros</strong></div>
        {mode === 'time' ? <div className={styles.tableWrap}><table><thead><tr><th>Origem / ID</th><th>Cliente</th><th>Técnico</th><th>Nível / Tipo</th><th>Status</th><th>Abertura</th><th>Tempo desde abertura</th></tr></thead><tbody>{report.rows.map(row => <tr key={`${row.source}-${row.id}`}><td>{SOURCE_LABELS[row.source]} #{row.id}</td><td>{row.clientName}</td><td>{row.technicianName}</td><td>{row.source === 'tasks' ? row.type : row.level}</td><td>{STATUS[row.status] ?? row.status}</td><td>{row.openedAt.replace('T', ' ')}</td><td>{duration(row.elapsedSeconds)}</td></tr>)}</tbody></table></div>
          : report.rows.map(row => <article className={styles.row} key={`${row.source}-${row.id}`}><div className={styles.rowHeader}><strong>{SOURCE_LABELS[row.source]} #{row.id} · {row.clientName}</strong><span>{STATUS[row.status] ?? row.status}</span></div>
            <p>{row.locationName || 'Local não informado'} · {row.locationAddress} · Solicitante: {row.requesterName || 'Não informado'}</p>
            <p>Abertura: {row.openedAt.replace('T', ' ')} · Técnico: {row.technicianName} · Nível {row.level} · {TYPES[row.type] ?? row.type} · {METHODS[row.method] ?? row.method}</p>
            <p>{[row.categoryName, row.subcategoryName, row.itemName].filter(Boolean).join(' / ')}</p>
            <p className={styles.details}><strong>Descrição de abertura: </strong>{row.openingDescription}</p>
            {row.closedAt || row.closingDescription ? <p className={styles.details}><strong>Fechamento: {row.closedAt?.replace('T', ' ')} </strong>{row.closingDescription}</p> : null}
          </article>)}
        {!report.rows.length ? <p className={styles.empty}>Nenhum registro para os filtros selecionados.</p> : null}
      </section> : null}
    </div>
  </main>;
}

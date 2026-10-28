'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { TICKET_STATUS_LABELS, type CurrentUserResponse, type ReportSector, type TicketAnalyticsResponse, type TicketReportCatalog, type TicketReportSource } from '@helpdesk/contracts';
import { apiDownload, apiRequest } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { appButtonClass } from '../../../shared/ui/button-styles';
import { DateRangePicker } from '../../../shared/ui/date-range-picker';
import { SearchSelect } from '../../../shared/ui/search-select';
import { downloadCsv, duration, reportError } from '../lib/report-export';
import { groupReportRows, reportChartGroups, type ReportGrouping } from '../lib/report-center';
import { ReportChartTypePicker, ReportChartView, type ReportChartType } from './report-chart-view';
import { ReportSectorFilter, ReportSectorSummary, sectorTechnicians } from './report-sector-filter';
import { ReportSections } from './report-sections';

type Filters = { startDate: string; endDate: string; source: TicketReportSource; sector: ReportSector; clientIds: string[]; technicianId: string; categoryId: string; locationId: string; categorySector: string; projectId: string; level: string; status: string };
const EMPTY: TicketReportCatalog = { clients: [], locations: [], technicians: [], categories: [], projects: [] };
const CARD = 'min-w-0 rounded-2xl border border-app-border bg-app-surface shadow-sm';
const INPUT = 'min-h-10 w-full min-w-0 rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text focus-visible:outline-2 focus-visible:outline-app-brand disabled:opacity-50';
const SECONDARY = appButtonClass('secondary');
const PAGE_SIZE = 50;
const STATUS: Readonly<Record<number, string>> = TICKET_STATUS_LABELS;
const SOURCES: Record<TicketReportSource, string> = { tickets: 'Atendimentos', tasks: 'Tarefas', projects: 'Projetos', improvements: 'Melhorias', unified: 'Atendimentos e tarefas' };
const GROUPS: Array<{ value: ReportGrouping; label: string }> = [
  { value: 'client', label: 'Por cliente' }, { value: 'technician', label: 'Por técnico' },
  { value: 'category', label: 'Por categoria' }, { value: 'requester', label: 'Por solicitante' },
  { value: 'client-daily', label: 'Diário por cliente' }, { value: 'technician-daily', label: 'Diário por técnico' },
  { value: 'project', label: 'Por projeto' }, { value: 'status', label: 'Por situação' },
];

function initialFilters(projects: boolean): Filters {
  return { startDate: '', endDate: '', source: projects ? 'tasks' : 'tickets', sector: 'all', clientIds: [], technicianId: '0', categoryId: '0', locationId: '0', categorySector: '0', projectId: '0', level: '0', status: '0' };
}

function queryFor(values: Filters): string {
  const query = new URLSearchParams({ startDate: values.startDate, endDate: values.endDate, source: values.source, sector: values.sector,
    clientIds: values.clientIds.join(','), technicianId: values.technicianId, categoryId: values.categoryId, projectId: values.projectId, locationId: values.locationId, categorySector: values.categorySector,
    level: values.level, status: values.status });
  return query.toString();
}

export function ReportCenterScreen({ currentUser, area }: { currentUser: CurrentUserResponse; area: 'tickets' | 'projects' }) {
  const projects = area === 'projects';
  const [filters, setFilters] = useState<Filters>(() => initialFilters(projects));
  const [catalog, setCatalog] = useState<TicketReportCatalog>(EMPTY);
  const [report, setReport] = useState<TicketAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [grouping, setGrouping] = useState<ReportGrouping>('client');
  const [chartType, setChartType] = useState<ReportChartType>('bar');
  const [search, setSearch] = useState('');
  const [zabbix, setZabbix] = useState('all');
  const [page, setPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);
  const request = useRef<AbortController | null>(null);
  const printedDetails = useRef(new Map<HTMLDetailsElement, boolean>());
  const catalogClient = filters.clientIds.length === 1 ? filters.clientIds[0] ?? '0' : '0';
  const canPdf = currentUser.grants.some(grant => grant.permission === 'system.admin' || grant.permission === 'reports.pdf');

  useEffect(() => {
    const beforePrint = () => {
      flushSync(() => setPrinting(true));
      document.querySelectorAll<HTMLDetailsElement>('[data-report-center] details').forEach(detail => {
        if (!printedDetails.current.has(detail)) printedDetails.current.set(detail, detail.open);
        detail.open = true;
      });
    };
    const afterPrint = () => {
      printedDetails.current.forEach((open, detail) => { detail.open = open; });
      printedDetails.current.clear(); setPrinting(false);
    };
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => { window.removeEventListener('beforeprint', beforePrint); window.removeEventListener('afterprint', afterPrint); };
  }, []);

  async function load(values: Filters) {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    try {
      const response = await apiRequest<TicketAnalyticsResponse>(`reports/tickets/analytics?${queryFor(values)}`, { signal: controller.signal });
      if (!controller.signal.aborted) { setReport(response); setPage(1); setGroupPage(1); }
    } catch (reason) {
      if (!controller.signal.aborted) { setReport(null); setError(reportError(reason)); }
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }

  useEffect(() => {
    const controller = new AbortController();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const next = { ...initialFilters(projects), startDate: `${today.slice(0, 7)}-01`, endDate: today };
    setFilters(next); void load(next);
    return () => { controller.abort(); request.current?.abort(); };
  }, [projects]);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<TicketReportCatalog>(`reports/tickets/catalog?clientId=${catalogClient}${projects ? '&projects=1' : ''}`, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setCatalog(value); })
      .catch(reason => { if (!controller.signal.aborted) setError(reportError(reason)); });
    return () => controller.abort();
  }, [projects, catalogClient]);

  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return (report?.rows ?? []).filter(row => {
      const mentions = `${row.openingDescription} ${row.closingDescription}`.toLowerCase().includes('zabbix');
      if (zabbix === 'yes' && !mentions || zabbix === 'no' && mentions) return false;
      return !query || [row.id, row.title, row.projectName, row.clientName, row.technicianName, row.technicianFunction, row.requesterName, row.categoryName, row.openingDescription, row.closingDescription].join(' ').toLocaleLowerCase('pt-BR').includes(query);
    });
  }, [report, search, zabbix]);
  const coverage = useMemo(() => {
    const result = { total: rows.length, ti: 0, devops: 0, other: 0, unassigned: 0 };
    for (const row of rows) {
      if (!row.technicianId) result.unassigned++;
      else if (row.technicianSector === 'ti') result.ti++;
      else if (row.technicianSector === 'devops') result.devops++;
      else result.other++;
    }
    return result;
  }, [rows]);
  const groups = useMemo(() => groupReportRows(rows, grouping).map(row => grouping === 'status' ? { ...row, label: STATUS[Number(row.key)] ?? row.label } : row), [rows, grouping]);
  const chartRows = useMemo(() => reportChartGroups(groups), [groups]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE)), groupPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const activePage = Math.min(page, pages), activeGroupPage = Math.min(groupPage, groupPages);
  const mentions = rows.filter(row => `${row.openingDescription} ${row.closingDescription}`.toLowerCase().includes('zabbix')).length;

  function apply(event: FormEvent) { event.preventDefault(); setSearch(''); setZabbix('all'); void load(filters); }
  function exportRows() {
    downloadCsv(`registros-${area}.csv`, [['Origem', 'ID', 'Título', 'Projeto', 'Cliente', 'Local', 'Solicitante', 'Técnico', 'Função', 'Categoria', 'Subcategoria', 'Item', 'Tipo', 'Nível', 'Forma', 'Situação', 'Abertura', 'Fechamento', 'Descrição abertura', 'Descrição fechamento', 'Tempo decorrido'],
      ...rows.map(row => [SOURCES[row.source], row.id, row.title ?? '', row.projectName ?? '', row.clientName, row.locationName, row.requesterName, row.technicianName, row.technicianFunction ?? '', row.categoryName, row.subcategoryName, row.itemName, row.type, row.level, row.method, STATUS[row.status] ?? row.status, row.openedAt, row.closedAt ?? '', row.openingDescription, row.closingDescription, duration(row.elapsedSeconds)])]);
  }
  async function exportPdf() {
    if (!report) return;
    setExporting(true); setError('');
    try {
      const query = new URLSearchParams(Object.entries(report.filters).filter(([, value]) => value !== undefined).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : String(value)]));
      await apiDownload(`reports/tickets/analytics.pdf?${query}`, 'relatorio.pdf');
    } catch (reason) { setError(reportError(reason)); } finally { setExporting(false); }
  }

  return <main className="min-h-screen bg-app-bg text-app-text print:bg-white [print-color-adjust:exact] max-sm:[&>header]:flex-wrap max-sm:[&>header]:gap-2 max-sm:[&>header>div:last-child]:w-full" data-report-center={area}>
    <AppPageHeader title={projects ? 'Relatórios Tarefas/Projetos' : 'Relatórios Atendimentos'} subtitle="Filtros, gráficos, resumos e registros detalhados em uma única página." user={currentUser} />
    <div className="mx-auto grid w-full max-w-[1600px] gap-5 px-5 py-6 max-sm:px-3 print:max-w-none print:p-0">
      <ReportSections active={area} user={currentUser} />
      {error ? <p role="alert" className="m-0 rounded-xl border border-app-danger-border bg-app-danger-soft p-4 text-sm text-app-danger">{error}</p> : null}
      <form onSubmit={apply} className={`${CARD} grid grid-cols-4 items-end gap-4 p-5 max-xl:grid-cols-2 max-sm:grid-cols-1 print:hidden`}>
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-app-muted">Consulta<select aria-label="Consulta" className={INPUT} disabled={loading} value={filters.source} onChange={event => setFilters(current => ({ ...current, source: event.target.value as TicketReportSource, projectId: '0' }))}>
          {(projects ? ['tasks', 'projects'] as const : ['tickets', 'improvements', 'unified'] as const).map(source => <option key={source} value={source}>{SOURCES[source]}</option>)}
        </select></label>
        <div className="min-w-0"><span className="mb-1.5 block text-xs font-semibold text-app-muted">Período</span><DateRangePicker startDate={filters.startDate} endDate={filters.endDate} disabled={loading} onChange={range => setFilters(current => ({ ...current, ...range }))} /></div>
        <ReportSectorFilter value={filters.sector} disabled={loading} onChange={sector => setFilters(current => ({ ...current, sector, technicianId: '0' }))} />
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-app-muted">Clientes<SearchSelect disabled={loading} multiple multipleLabel="clientes" options={catalog.clients.map(row => ({ value: String(row.id), label: row.name }))} value={filters.clientIds} onChange={clientIds => setFilters(current => ({ ...current, clientIds, locationId: '0', projectId: '0' }))} placeholder="Todos os clientes" /></label>
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-app-muted">Técnico<SearchSelect disabled={loading} options={sectorTechnicians(catalog, filters.sector).map(row => ({ value: String(row.id), label: row.name }))} value={filters.technicianId === '0' ? [] : [filters.technicianId]} onChange={value => setFilters(current => ({ ...current, technicianId: value[0] ?? '0' }))} placeholder="Todos os técnicos" /></label>
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-app-muted">Categoria<SearchSelect disabled={loading} options={catalog.categories.map(row => ({ value: String(row.id), label: row.name }))} value={filters.categoryId === '0' ? [] : [filters.categoryId]} onChange={value => setFilters(current => ({ ...current, categoryId: value[0] ?? '0' }))} placeholder="Todas as categorias" /></label>
        {projects ? <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-app-muted">Projeto<SearchSelect disabled={loading} options={(catalog.projects ?? []).map(row => ({ value: String(row.id), label: row.name }))} value={filters.projectId === '0' ? [] : [filters.projectId]} onChange={value => setFilters(current => ({ ...current, projectId: value[0] ?? '0' }))} placeholder="Todos os projetos" /></label>
          : <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-app-muted">Nível<select aria-label="Nível" className={INPUT} disabled={loading} value={filters.level} onChange={event => setFilters(current => ({ ...current, level: event.target.value }))}><option value="0">Todos os níveis</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}</select></label>}
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-app-muted">Situação<select aria-label="Situação" className={INPUT} disabled={loading} value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="0">Todas as situações ativas</option>{Object.entries(STATUS).filter(([value]) => value !== '0').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <details className="col-span-full rounded-lg border border-app-border p-3"><summary className="cursor-pointer text-sm font-semibold text-app-muted">Filtros adicionais</summary><div className="mt-3 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-app-muted">Local<SearchSelect disabled={loading || filters.clientIds.length !== 1} options={catalog.locations.map(row => ({ value: String(row.id), label: row.name }))} value={filters.locationId === '0' ? [] : [filters.locationId]} onChange={value => setFilters(current => ({ ...current, locationId: value[0] ?? '0' }))} placeholder="Todos os locais" /><span>Selecione um cliente para filtrar por local.</span></label>
          <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-app-muted">Área da categoria<select aria-label="Área da categoria" className={INPUT} disabled={loading} value={filters.categorySector} onChange={event => setFilters(current => ({ ...current, categorySector: event.target.value }))}><option value="0">Todas as áreas</option><option value="1">TI</option><option value="3">DevOps / Administrativo</option><option value="2">Marketing</option></select></label>
        </div></details>
        <div className="col-span-full flex flex-wrap justify-end gap-2"><button className={SECONDARY} type="button" disabled={loading} onClick={() => { const next = { ...initialFilters(projects), startDate: filters.startDate, endDate: filters.endDate }; setFilters(next); setSearch(''); setZabbix('all'); void load(next); }}>Limpar filtros</button><button type="submit" className={appButtonClass('primary')} disabled={loading}>{loading ? 'Carregando…' : 'Aplicar filtros'}</button></div>
      </form>
      {report ? <>
        <p className="m-0 text-sm text-app-muted">{SOURCES[report.filters.source]} · {report.filters.startDate.split('-').reverse().join('/')} a {report.filters.endDate.split('-').reverse().join('/')} · {report.total.toLocaleString('pt-BR')} registro(s) no período</p>
        <p className="m-0 break-words text-xs text-app-muted">Clientes: {report.filters.clientIds.length ? catalog.clients.filter(client => report.filters.clientIds.includes(client.id)).map(client => client.name).join(', ') || report.filters.clientIds.join(', ') : 'Todos'} · Técnico: {catalog.technicians.find(row => row.id === report.filters.technicianId)?.name ?? 'Todos'} · Categoria: {catalog.categories.find(row => row.id === report.filters.categoryId)?.name ?? 'Todas'}{projects ? ` · Projeto: ${catalog.projects?.find(row => row.id === report.filters.projectId)?.name ?? 'Todos'}` : ` · Nível: ${report.filters.level || 'Todos'}`} · Situação: {report.filters.status ? STATUS[report.filters.status] ?? report.filters.status : 'Todas as situações ativas'}</p>
        <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">{([
          ['Registros exibidos', rows.length], ['Finalizados / concluídos', rows.filter(row => row.status === 4 || row.status === 5).length], ['Sem técnico localizado', coverage.unassigned], ['Com menção ao Zabbix', mentions],
        ] as const).map(([label, count]) => <div className={`${CARD} p-4`} key={label}><p className="mb-2 mt-0 text-xs font-semibold text-app-muted">{label}</p><strong className="text-2xl">{count.toLocaleString('pt-BR')}</strong></div>)}</div>
        <section className={`${CARD} p-5`} aria-label="Explorar resultados">
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_minmax(180px,280px)] gap-3 max-sm:grid-cols-1 print:hidden"><input className={INPUT} aria-label="Buscar nos resultados" placeholder="Buscar nome, projeto, função ou descrição…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); setGroupPage(1); }} type="search" /><select aria-label="Menção ao Zabbix" className={INPUT} value={zabbix} onChange={event => { setZabbix(event.target.value); setPage(1); setGroupPage(1); }}><option value="all">Todas as menções</option><option value="yes">Com menção ao Zabbix</option><option value="no">Sem menção ao Zabbix</option></select></div>
          <ReportSectorSummary value={report.filters.sector} coverage={coverage} />
          <p className="mb-4 mt-0 text-xs text-app-muted">A menção ao Zabbix é identificada no texto das descrições; registros sem técnico não são classificados automaticamente como Zabbix.</p>
          <div className="flex flex-wrap items-end justify-between gap-3 print:hidden"><label className="grid gap-1.5 text-xs font-semibold text-app-muted">Visualização<select aria-label="Visualização" className={INPUT} value={grouping} onChange={event => { setGrouping(event.target.value as ReportGrouping); setGroupPage(1); }}>{GROUPS.filter(group => projects || group.value !== 'project').map(group => <option key={group.value} value={group.value}>{group.label}</option>)}</select></label><ReportChartTypePicker value={chartType} onChange={setChartType} /><div className="flex flex-wrap gap-2"><button className={SECONDARY} disabled={!rows.length} onClick={exportRows} type="button">Exportar registros</button><button className={SECONDARY} onClick={() => window.print()} type="button">Imprimir / PDF</button>{canPdf ? <button className={SECONDARY} disabled={exporting || Boolean(search.trim()) || zabbix !== 'all'} onClick={() => void exportPdf()} type="button" title="PDF do período e dos filtros aplicados. Limpe a busca e o filtro de menção para baixar.">{exporting ? 'Preparando…' : 'Baixar PDF analítico'}</button> : null}</div></div>
          <h2 className="mb-1 mt-5 text-lg font-bold">{GROUPS.find(group => group.value === grouping)?.label}</h2>
          {groups.length > 20 ? <p className="text-xs text-app-muted">O gráfico reúne os 20 maiores grupos e os demais. O resumo e a exportação incluem todos os grupos.</p> : null}
          <ReportChartView rows={chartRows} type={chartType} />
          <div className="mb-3 mt-6 flex flex-wrap items-center justify-between gap-3"><h3 className="m-0 text-sm font-bold">Resumo por grupo ({groups.length})</h3><button type="button" className={`${SECONDARY} print:hidden`} disabled={!groups.length} onClick={() => downloadCsv(`resumo-${grouping}.csv`, [['Data', 'Grupo', 'Nível 1', 'Nível 2', 'Nível 3', 'Outros níveis', 'Total'], ...groups.map(row => [row.date ?? '', row.label, row.level1, row.level2, row.level3, row.other ?? 0, row.total])])}>Exportar resumo</button></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] border-collapse text-left text-sm"><thead className="bg-app-surface-muted text-xs text-app-muted"><tr>{['Data', 'Grupo', 'Nível 1', 'Nível 2', 'Nível 3', 'Outros níveis', 'Total'].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>{(printing ? groups : groups.slice((activeGroupPage - 1) * PAGE_SIZE, activeGroupPage * PAGE_SIZE)).map(row => <tr key={row.key} className="border-t border-app-border"><td className="whitespace-nowrap p-3">{row.date?.split('-').reverse().join('/') ?? '—'}</td><td className="p-3">{row.label}</td><td className="p-3">{row.level1}</td><td className="p-3">{row.level2}</td><td className="p-3">{row.level3}</td><td className="p-3">{row.other ?? 0}</td><td className="p-3 font-bold">{row.total}</td></tr>)}</tbody></table></div>
          <Pagination page={activeGroupPage} pages={groupPages} onChange={setGroupPage} label="grupos" />
        </section>
        <section className={`${CARD} overflow-hidden`} aria-labelledby="report-records-title"><h2 id="report-records-title" className="m-0 border-b border-app-border p-5 text-base font-bold">Registros detalhados ({rows.length})</h2><div className="overflow-x-auto"><table className="w-full min-w-[1100px] border-collapse text-left text-sm"><thead className="bg-app-surface-muted text-xs text-app-muted"><tr>{['Registro', 'Cliente / projeto', 'Técnico / solicitante', 'Classificação', 'Abertura / fechamento', 'Descrição'].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>{(printing ? rows : rows.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE)).map(row => <tr key={`${row.source}:${row.id}`} className="border-t border-app-border align-top"><td className="p-3"><strong>{SOURCES[row.source]} #{row.id}</strong><span className="mt-1 block max-w-64 break-words">{row.title}</span><span className="mt-1 block text-xs text-app-muted">{STATUS[row.status] ?? row.status}</span></td><td className="p-3">{row.clientName}<span className="mt-1 block text-xs text-app-muted">{row.projectName}</span><span className="mt-1 block text-xs text-app-muted">{row.locationName}</span></td><td className="p-3">{row.technicianName}<span className="mt-1 block text-xs text-app-muted">{row.technicianFunction}</span><span className="mt-1 block text-xs text-app-muted">Solicitante: {row.requesterName || 'Não informado'}</span></td><td className="p-3">{row.categoryName || 'Sem categoria'}<span className="mt-1 block text-xs text-app-muted">{[row.subcategoryName, row.itemName].filter(Boolean).join(' / ')}</span><span className="mt-1 block text-xs text-app-muted">Nível {row.level}</span></td><td className="whitespace-nowrap p-3 text-xs">{row.openedAt.replace('T', ' ')}<span className="mt-1 block">{row.closedAt?.replace('T', ' ') ?? 'Em aberto'}</span><span className="mt-1 block text-app-muted">Decorrido: {duration(row.elapsedSeconds)}</span></td><td className="min-w-64 max-w-sm p-3"><details><summary className="cursor-pointer font-semibold text-app-brand">Ver descrições</summary><p className="whitespace-pre-wrap break-words">{row.openingDescription || 'Sem descrição de abertura.'}</p><p className="whitespace-pre-wrap break-words text-app-muted">{row.closingDescription || 'Sem descrição de fechamento.'}</p></details></td></tr>)}</tbody></table></div>{!rows.length ? <p className="p-6 text-center text-sm text-app-muted">Nenhum registro encontrado.</p> : null}<div className="px-5"><Pagination page={activePage} pages={pages} onChange={setPage} label="registros" /></div></section>
      </> : loading ? <p role="status" className="text-sm text-app-muted">Carregando relatório…</p> : null}
    </div>
  </main>;
}

function Pagination({ page, pages, onChange, label }: { page: number; pages: number; onChange: (page: number) => void; label: string }) {
  return <div className="my-4 flex flex-wrap items-center justify-end gap-3 text-xs print:hidden" aria-label={`Paginação de ${label}`}><span>Página {page} de {pages}</span><button type="button" className={SECONDARY} disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</button><button type="button" className={SECONDARY} disabled={page >= pages} onClick={() => onChange(page + 1)}>Próxima</button></div>;
}

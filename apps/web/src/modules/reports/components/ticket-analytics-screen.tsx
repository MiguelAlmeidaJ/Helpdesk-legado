'use client';

import {
  TICKET_STATUS_LABELS,
  type CurrentUserResponse,
  type TicketAnalyticsResponse,
  type TicketReportCatalog,
  type TicketReportSource,
  type TechnicianWorkloadResponse,
} from '@helpdesk/contracts';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { apiDownload, apiRequest } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { DateRangePicker } from '../../../shared/ui/date-range-picker';
import { appButtonClass } from '../../../shared/ui/button-styles';
import { SearchSelect } from '../../../shared/ui/search-select';
import { downloadCsv, duration, reportError } from '../lib/report-export';

const SOURCE_LABELS: Record<TicketReportSource, string> = {
  tickets: 'Atendimentos',
  tasks: 'Tarefas',
  improvements: 'Melhorias',
  unified: 'Unificado',
};
const STATUS: Readonly<Record<number, string>> = TICKET_STATUS_LABELS;
const TYPES: Record<number, string> = {
  1: 'Falha',
  2: 'Relacionamento',
  3: 'Requisição de Serviços',
  4: 'Requisição de Informação',
  5: 'Monitoramento',
};
const METHODS: Record<number, string> = {
  1: 'Atendimento Remoto',
  2: 'Atendimento Presencial',
  3: 'Remoto — plantão',
  4: 'Presencial — plantão',
};
const AREA_LABELS: Record<number, string> = {
  1: 'Suporte T.I',
  2: 'Marketing',
  3: 'ADM / DevOps',
};
const EMPTY_CATALOG: TicketReportCatalog = {
  clients: [],
  locations: [],
  technicians: [],
  categories: [],
};
const PRIMARY = appButtonClass('primary');
const SECONDARY = appButtonClass('secondary');
const DANGER_OUTLINE =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-red-300 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50';

type ScreenFilters = {
  startDate: string;
  endDate: string;
  clientId: string;
  clientIds: string;
  locationId: string;
  technicianId: string;
  categoryId: string;
  categorySector: string;
  status: string;
  level: string;
  source: string;
  view: string;
};

function reportTitle(mode: 'analytics' | 'workload' | 'time', source: string, sector: string) {
  if (mode === 'workload') return 'Tempo médio por técnico';
  if (mode === 'time') return 'Relatório de tempo por técnico';
  if (source === 'tasks') return 'Relatório de tarefas por Cliente';
  if (source === 'unified') return 'Relatório unificado de atendimentos';
  if (source === 'improvements') return 'Relatório analítico de Melhorias';
  if (sector === '1') return 'Relatório de atendimentos da TI por Técnico';
  return 'Relatório de atendimentos por Cliente';
}

function reportSubtitle(mode: 'analytics' | 'workload' | 'time', source: string) {
  if (mode === 'workload') {
    return 'Resumo de atendimentos abertos, em espera, vencidos e tempo acumulado.';
  }
  if (mode === 'time') {
    return 'Consulte o tempo de atendimento por período, área e técnico.';
  }
  if (source === 'tasks') {
    return 'Consulte as tarefas por cliente, período, local e classificação.';
  }
  if (source === 'unified') {
    return 'Combine atendimentos e tarefas em uma única visão analítica.';
  }
  return 'Consulte os registros por cliente, período, local, técnico e classificação.';
}

function reportHeading(report: TicketAnalyticsResponse) {
  if (report.filters.source === 'tasks') return 'Relatório analítico de tarefas por Cliente';
  if (report.filters.source === 'unified') {
    const area = AREA_LABELS[report.filters.categorySector];
    return `Relatório analítico de Atendimentos Por Cliente${area ? ` - ${area}` : ''}`;
  }
  if (report.filters.source === 'improvements') return 'Relatório analítico de Melhorias';
  const area = AREA_LABELS[report.filters.categorySector];
  return `Relatório analítico de Atendimentos Por Cliente${area ? ` - ${area}` : ''}`;
}

function localDateTime(value: string | null) {
  if (!value) return '—';
  const [date = '', time = ''] = value.replace('T', ' ').split(' ');
  const [year, month, day] = date.split('-');
  return year && month && day
    ? `${day}/${month}/${year} ${time.slice(0, 5)}`
    : value;
}

function serviceDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${days} dias, ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function chip(text: string) {
  return (
    <span className="inline-flex min-h-7 items-center rounded-full border border-app-border bg-app-surface-muted px-3 text-xs font-semibold text-app-text-soft">
      {text}
    </span>
  );
}

export function TicketAnalyticsScreen({
  currentUser,
  mode,
  initialSource = 'tickets',
  initialFilters = {},
}: {
  currentUser: CurrentUserResponse;
  mode: 'analytics' | 'workload' | 'time';
  initialSource?: TicketReportSource;
  initialFilters?: Record<string, string>;
}) {
  const [filters, setFilters] = useState<ScreenFilters>({
    startDate: '',
    endDate: '',
    clientId: '0',
    clientIds: '',
    locationId: '0',
    technicianId: '0',
    categoryId: '0',
    categorySector: '0',
    status: '0',
    level: '0',
    source: initialSource,
    ...initialFilters,
    view: mode === 'time' ? 'time' : 'analytics',
  });
  const [report, setReport] = useState<TicketAnalyticsResponse | null>(null);
  const [workload, setWorkload] = useState<TechnicianWorkloadResponse | null>(null);
  const [catalog, setCatalog] = useState<TicketReportCatalog>(EMPTY_CATALOG);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const sourceLocked = Boolean(initialFilters.source);
  const areaLocked = initialFilters.lockArea === '1';
  const title = reportTitle(mode, filters.source, filters.categorySector);

  async function load(values: ScreenFilters) {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      if (mode === 'workload') {
        const response = await apiRequest<TechnicianWorkloadResponse>(
          'reports/tickets/workload',
        );
        if (id === requestId.current) setWorkload(response);
      } else {
        const query = new URLSearchParams(
          Object.entries(values).filter(
            ([key, value]) => key !== 'lockArea' && value !== '',
          ),
        );
        const response = await apiRequest<TicketAnalyticsResponse>(
          `reports/tickets/analytics?${query}`,
        );
        if (id === requestId.current) {
          setReport(response);
          setFilters((current) => ({
            ...current,
            ...Object.fromEntries(
              Object.entries(response.filters).map(([key, value]) => [
                key,
                Array.isArray(value) ? value.join(',') : String(value),
              ]),
            ),
          }));
        }
      }
    } catch (reason) {
      if (id === requestId.current) {
        setError(reportError(reason));
        setReport(null);
        setWorkload(null);
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  useEffect(() => {
    void load(filters);
    const interval =
      mode === 'workload'
        ? setInterval(() => void load(filters), 60000)
        : undefined;
    return () => {
      requestId.current++;
      if (interval) clearInterval(interval);
    };
    // Initial request only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (mode === 'workload') return;
    let active = true;
    apiRequest<TicketReportCatalog>(
      `reports/tickets/catalog?clientId=${encodeURIComponent(
        filters.clientIds.split(',').filter(Boolean).length === 1
          ? filters.clientIds.split(',')[0] ?? '0'
          : filters.clientId,
      )}`,
    )
      .then((value) => {
        if (active) setCatalog(value);
      })
      .catch((reason) => {
        if (active) {
          setCatalog(EMPTY_CATALOG);
          setError(reportError(reason));
        }
      });
    return () => {
      active = false;
    };
  }, [filters.clientId, filters.clientIds, mode]);

  function apply(event: FormEvent) {
    event.preventDefault();
    void load(filters);
  }

  function clear() {
    const next: ScreenFilters = {
      ...filters,
      startDate: '',
      endDate: '',
      clientId: '0',
      clientIds: '',
      locationId: '0',
      technicianId: '0',
      categoryId: '0',
      categorySector: areaLocked ? filters.categorySector : '0',
      status: '0',
      level: '0',
      source: sourceLocked ? filters.source : initialSource,
      view: mode === 'time' ? 'time' : 'analytics',
    };
    setFilters(next);
    void load(next);
  }

  function exportCsv() {
    if (workload) {
      downloadCsv('atendimentos-abertos.csv', [
        ['Técnico', 'Abertos', 'Em espera', 'Vencidos', 'Tempo acumulado'],
        ...workload.rows.map((row) => [
          row.technicianName,
          row.open,
          row.waiting,
          row.overdue,
          duration(row.elapsedSeconds),
        ]),
      ]);
    }
    if (report) {
      downloadCsv(
        `analitico-${report.filters.startDate}-${report.filters.endDate}.csv`,
        [
          [
            'Origem',
            'ID',
            'Cliente',
            'Local',
            'Solicitante',
            'Técnico',
            'Categoria',
            'Subcategoria',
            'Item',
            'Tipo',
            'Nível',
            'Forma',
            'Status',
            'Abertura',
            'Fechamento',
            'Descrição abertura',
            'Descrição fechamento',
            'Tempo de atendimento',
          ],
          ...report.rows.map((row) => [
            SOURCE_LABELS[row.source],
            row.id,
            row.clientName,
            row.locationName,
            row.requesterName,
            row.technicianName,
            row.categoryName,
            row.subcategoryName,
            row.itemName,
            TYPES[row.type] ?? row.type,
            row.level,
            METHODS[row.method] ?? row.method,
            STATUS[row.status] ?? row.status,
            row.openedAt,
            row.closedAt ?? '',
            row.openingDescription,
            row.closingDescription,
            serviceDuration(row.elapsedSeconds),
          ]),
        ],
      );
    }
  }

  const timeRows = useMemo(
    () =>
      [...(report?.rows ?? [])].sort(
        (a, b) =>
          a.technicianName.localeCompare(b.technicianName, 'pt-BR') ||
          a.openedAt.localeCompare(b.openedAt) ||
          a.id - b.id,
      ),
    [report],
  );

  return (
    <main className="min-h-screen bg-app-bg text-app-text print:bg-white">
      <AppPageHeader
        subtitle={reportSubtitle(mode, filters.source)}
        title={title}
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1550px] px-5 py-5 max-sm:px-3">
        {mode !== 'workload' ? (
          <form
            className="mb-4 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm print:hidden"
            onSubmit={apply}
          >
            <div className="grid grid-cols-6 items-end gap-3 max-[1200px]:grid-cols-3 max-[760px]:grid-cols-1">
              {mode !== 'time' ? (
                <label className="grid gap-1.5 text-xs font-bold text-app-muted">
                  Clientes
                  <SearchSelect
                    disabled={loading}
                    multiple
                    multipleLabel="clientes selecionados"
                    onChange={(values) =>
                      setFilters({
                        ...filters,
                        clientId: '0',
                        clientIds: values.join(','),
                        locationId: '0',
                      })
                    }
                    options={catalog.clients.map((row) => ({
                      value: String(row.id),
                      label: row.name,
                    }))}
                    placeholder="Todos os clientes"
                    searchPlaceholder="Pesquisar cliente..."
                    value={filters.clientIds.split(',').filter(Boolean)}
                  />
                </label>
              ) : null}

              <div className={mode === 'time' ? 'col-span-2 max-[760px]:col-span-1' : 'col-span-2 max-[1200px]:col-span-2 max-[760px]:col-span-1'}>
                <span className="mb-1.5 block text-xs font-bold text-app-muted">
                  Período
                </span>
                <DateRangePicker
                  disabled={loading}
                  endDate={filters.endDate}
                  onChange={(range) =>
                    setFilters({
                      ...filters,
                      startDate: range.startDate,
                      endDate: range.endDate,
                    })
                  }
                  startDate={filters.startDate}
                />
              </div>

              {mode !== 'time' ? (
                <label className="grid gap-1.5 text-xs font-bold text-app-muted">
                  Local
                  <SearchSelect
                    disabled={
                      loading ||
                      filters.clientIds.split(',').filter(Boolean).length !== 1
                    }
                    onChange={(values) =>
                      setFilters({
                        ...filters,
                        locationId: values[0] ?? '0',
                      })
                    }
                    options={catalog.locations.map((row) => ({
                      value: String(row.id),
                      label: row.name,
                    }))}
                    placeholder={
                      filters.clientIds.split(',').filter(Boolean).length === 1
                        ? 'Todos os locais'
                        : 'Selecione apenas 1 cliente'
                    }
                    searchPlaceholder="Pesquisar local..."
                    value={filters.locationId !== '0' ? [filters.locationId] : []}
                  />
                </label>
              ) : null}

              <label className="grid gap-1.5 text-xs font-bold text-app-muted">
                Área
                <SearchSelect
                  disabled={loading || areaLocked}
                  onChange={(values) =>
                    setFilters({
                      ...filters,
                      categorySector: values[0] ?? '0',
                    })
                  }
                  options={Object.entries(AREA_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  placeholder="Todas as áreas"
                  searchable={false}
                  value={
                    filters.categorySector !== '0'
                      ? [filters.categorySector]
                      : []
                  }
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold text-app-muted">
                Técnico
                <SearchSelect
                  disabled={loading}
                  onChange={(values) =>
                    setFilters({
                      ...filters,
                      technicianId: values[0] ?? '0',
                    })
                  }
                  options={catalog.technicians.map((row) => ({
                    value: String(row.id),
                    label: row.name,
                  }))}
                  placeholder="Todos os técnicos"
                  searchPlaceholder="Pesquisar técnico..."
                  value={
                    filters.technicianId !== '0'
                      ? [filters.technicianId]
                      : []
                  }
                />
              </label>

              {mode !== 'time' ? (
                <>
                  <label className="grid gap-1.5 text-xs font-bold text-app-muted">
                    Nível
                    <SearchSelect
                      disabled={loading}
                      onChange={(values) =>
                        setFilters({
                          ...filters,
                          level: values[0] ?? '0',
                        })
                      }
                      options={[1, 2, 3, 4, 5].map((value) => ({
                        value: String(value),
                        label: `Nível ${value}`,
                      }))}
                      placeholder="Todos"
                      searchable={false}
                      value={filters.level !== '0' ? [filters.level] : []}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-bold text-app-muted">
                    Categoria
                    <SearchSelect
                      disabled={loading}
                      onChange={(values) =>
                        setFilters({
                          ...filters,
                          categoryId: values[0] ?? '0',
                        })
                      }
                      options={catalog.categories.map((row) => ({
                        value: String(row.id),
                        label: row.name,
                      }))}
                      placeholder="Todas as categorias"
                      searchPlaceholder="Pesquisar categoria..."
                      value={
                        filters.categoryId !== '0'
                          ? [filters.categoryId]
                          : []
                      }
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-bold text-app-muted">
                    Status
                    <SearchSelect
                      disabled={loading}
                      onChange={(values) =>
                        setFilters({
                          ...filters,
                          status: values[0] ?? '0',
                        })
                      }
                      options={Object.entries(STATUS).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      placeholder="Todos os status"
                      searchable={false}
                      value={filters.status !== '0' ? [filters.status] : []}
                    />
                  </label>

                  {!sourceLocked ? (
                    <label className="grid gap-1.5 text-xs font-bold text-app-muted">
                      Origem
                      <SearchSelect
                        allowClear={false}
                        disabled={loading}
                        onChange={(values) =>
                          setFilters({
                            ...filters,
                            source: values[0] ?? initialSource,
                          })
                        }
                        options={Object.entries(SOURCE_LABELS).map(
                          ([value, label]) => ({ value, label }),
                        )}
                        searchable={false}
                        value={[filters.source]}
                      />
                    </label>
                  ) : null}
                </>
              ) : null}

              <div className="col-span-full flex flex-wrap justify-end gap-2">
                <button className={PRIMARY} disabled={loading} type="submit">
                  {loading ? 'Atualizando…' : 'Filtrar'}
                </button>
                {mode !== 'time' ? (
                  <button
                    className={SECONDARY}
                    disabled={loading || !report}
                    onClick={exportCsv}
                    type="button"
                  >
                    Exportar CSV
                  </button>
                ) : null}
                {report ? (
                  <button
                    className={DANGER_OUTLINE}
                    disabled={loading}
                    onClick={() => {
                      const query = new URLSearchParams(
                        Object.entries(report.filters).map(([key, value]) => [
                          key,
                          String(value),
                        ]),
                      );
                      setLoading(true);
                      apiDownload(
                        `reports/tickets/analytics.pdf?${query}`,
                        'relatorio.pdf',
                      )
                        .catch((reason) => setError(reportError(reason)))
                        .finally(() => setLoading(false));
                    }}
                    type="button"
                  >
                    Gerar PDF
                  </button>
                ) : null}
                <button
                  className={SECONDARY}
                  disabled={loading}
                  onClick={clear}
                  type="button"
                >
                  Limpar
                </button>
              </div>
            </div>
          </form>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger">
            {error}
          </div>
        ) : null}

        {loading && !report && !workload ? (
          <div className="rounded-2xl border border-app-border bg-app-surface p-10 text-center text-sm text-app-muted">
            Carregando relatório…
          </div>
        ) : null}

        {!loading && workload ? (
          <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
            <header className="border-b border-app-border-soft px-5 py-4">
              <h2 className="m-0 text-lg font-extrabold">Tempo médio por técnico</h2>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead className="bg-app-surface-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase text-app-muted">Técnico</th>
                    <th className="px-4 py-3 text-center text-xs font-extrabold uppercase text-app-muted">Aberto</th>
                    <th className="px-4 py-3 text-center text-xs font-extrabold uppercase text-app-muted">Em espera</th>
                    <th className="px-4 py-3 text-center text-xs font-extrabold uppercase text-app-muted">Vencidos</th>
                    <th className="px-4 py-3 text-center text-xs font-extrabold uppercase text-app-muted">Tempo acumulado (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {workload.rows.map((row) => (
                    <tr className="border-t border-app-border-soft hover:bg-app-surface-hover" key={row.technicianId}>
                      <td className="px-4 py-3 text-sm font-extrabold">{row.technicianName}</td>
                      <td className="px-4 py-3 text-center text-sm">{row.open}</td>
                      <td className="px-4 py-3 text-center text-sm">{row.waiting}</td>
                      <td className={`px-4 py-3 text-center text-sm ${row.overdue > 0 ? 'font-bold text-app-danger' : ''}`}>{row.overdue}</td>
                      <td className="px-4 py-3 text-center text-sm">{Math.round(row.elapsedSeconds / 3600).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {!loading && report && mode === 'time' ? (
          <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft px-5 py-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-app-brand">
                  Tempo de atendimento por técnico
                </span>
                <h2 className="m-0 mt-1 text-lg font-extrabold">
                  {AREA_LABELS[report.filters.categorySector] ?? 'Todas as áreas'}
                </h2>
              </div>
              <strong>{report.total.toLocaleString('pt-BR')} registro(s)</strong>
            </header>
            <div className="max-h-[720px] overflow-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead className="sticky top-0 z-10 bg-app-surface-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase text-app-muted">ID</th>
                    <th className="px-4 py-3 text-center text-xs font-extrabold uppercase text-app-muted">Nível</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase text-app-muted">Técnico</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase text-app-muted">Abertura</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase text-app-muted">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase text-app-muted">Tempo de atendimento</th>
                  </tr>
                </thead>
                <tbody>
                  {timeRows.map((row) => (
                    <tr className="border-t border-app-border-soft hover:bg-app-surface-hover" key={`${row.source}-${row.id}`}>
                      <td className="px-4 py-3 text-sm font-semibold">#{row.id}</td>
                      <td className="px-4 py-3 text-center text-sm">{row.level}</td>
                      <td className="px-4 py-3 text-sm">{row.technicianName}</td>
                      <td className="px-4 py-3 text-sm">{localDateTime(row.openedAt)}</td>
                      <td className="px-4 py-3 text-sm">{STATUS[row.status] ?? row.status}</td>
                      <td className="px-4 py-3 text-sm font-medium">{serviceDuration(row.elapsedSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {!loading && report && mode === 'analytics' ? (
          <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
            <header className="border-b border-app-border-soft px-5 py-4">
              <h2 className="m-0 text-lg font-extrabold">{reportHeading(report)}</h2>
            </header>
            <div className="border-b border-app-border-soft px-5 py-4">
              <strong className="text-base">Total de registros: {report.total.toLocaleString('pt-BR')}</strong>
            </div>

            <div className="space-y-3 bg-app-surface-muted/35 p-3">
              {report.rows.map((row) => (
                <article
                  className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm"
                  key={`${row.source}-${row.id}`}
                >
                  <header className="border-b border-app-border-soft bg-app-surface-muted px-4 py-3">
                    <strong className="text-sm">
                      {row.source === 'tasks' ? 'Tarefa' : row.source === 'improvements' ? 'Melhoria' : 'ATD'} #{row.id}
                      {' | '}
                      {row.locationName || row.clientName}
                      {' | '}
                      {row.requesterName || 'Solicitante não informado'}
                    </strong>
                  </header>

                  <div className="grid grid-cols-3 gap-6 px-4 py-4 max-[900px]:grid-cols-1">
                    <div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        {chip(`Abertura: ${localDateTime(row.openedAt)}`)}
                        {chip(METHODS[row.method] ?? `Forma ${row.method || '—'}`)}
                        {chip(row.source === 'tasks' ? `Tarefa ${row.id}` : `Nível ${row.level}`)}
                        {chip(TYPES[row.type] ?? `Tipo ${row.type || '—'}`)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {row.categoryName ? chip(row.categoryName) : null}
                        {row.subcategoryName ? chip(row.subcategoryName) : null}
                        {row.itemName ? chip(row.itemName) : null}
                      </div>
                    </div>

                    <div>
                      <div className="mb-3">{chip(`Técnico: ${row.technicianName || 'Sem técnico'}`)}</div>
                      <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-app-text-soft">
                        <strong>Descrição de abertura: </strong>
                        {row.openingDescription || 'Sem descrição.'}
                      </p>
                    </div>

                    <div>
                      <div className="mb-3">{chip(`Fechamento: ${localDateTime(row.closedAt)}`)}</div>
                      <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-app-text-soft">
                        <strong>Descrição de fechamento: </strong>
                        {row.closingDescription || 'Sem descrição de fechamento.'}
                      </p>
                    </div>
                  </div>
                </article>
              ))}

              {!report.rows.length ? (
                <div className="rounded-xl border border-dashed border-app-border bg-app-surface p-10 text-center text-sm text-app-muted">
                  Nenhum registro para os filtros selecionados.
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

"use client";

import {
  TICKET_STATUS_LABELS,
  type CurrentUserResponse,
  type TicketAnalyticsResponse,
  type TicketReportCatalog,
} from '@helpdesk/contracts';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { DateRangePicker } from '../../../shared/ui/date-range-picker';
import { appButtonClass } from '../../../shared/ui/button-styles';
import { SearchSelect } from '../../../shared/ui/search-select';
import {
  fetchTicketReportCatalog,
  fetchTicketReportDetails,
} from '../api/reports-api';
import { downloadCsv } from '../lib/report-export';
import {
  ReportChartTypePicker,
  ReportChartView,
  type ReportChartType,
} from './report-chart-view';

export type TicketTotalsLevel = 0 | 1 | 2 | 3;

export interface TicketTotalsReportFilters {
  startDate?: string;
  endDate?: string;
  level?: TicketTotalsLevel;
  clientId?: number;
  clientIds?: number[];
  technicianId?: number;
  categoryId?: number;
  status?: number;
}

export interface TicketTotalsReportViewRow {
  id: number;
  name: string;
  level1: number;
  level2: number;
  level3: number;
  total: number;
}

export interface TicketTotalsReportViewResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  level: TicketTotalsLevel;
  total: number;
  rows: TicketTotalsReportViewRow[];
}

interface TicketTotalsReportScreenProps {
  currentUser: CurrentUserResponse;
  title: string;
  description: string;
  chartTitle?: string;
  emptyMessage: string;
  loadErrorMessage: string;
  loadReport: (
    filters?: TicketTotalsReportFilters,
  ) => Promise<TicketTotalsReportViewResponse>;
}

const PRIMARY = appButtonClass('primary');
const SECONDARY = appButtonClass('secondary');
const STATUS = TICKET_STATUS_LABELS as Readonly<Record<number, string>>;
const PAGE_SIZE = 100;

function openedAt(value: string): string {
  const [date = '', time = ''] = value.replace('T', ' ').split(' ');
  const [year, month, day] = date.split('-');
  return year && month && day
    ? `${day}/${month}/${year} ${time.slice(0, 5)}`
    : value;
}

export function TicketTotalsReportScreen({
  currentUser,
  title,
  description,
  chartTitle = 'Atendimentos',
  emptyMessage,
  loadErrorMessage,
  loadReport,
}: TicketTotalsReportScreenProps) {
  const [data, setData] = useState<TicketTotalsReportViewResponse | null>(null);
  const [details, setDetails] = useState<TicketAnalyticsResponse | null>(null);
  const [catalog, setCatalog] = useState<TicketReportCatalog>({
    clients: [],
    locations: [],
    technicians: [],
    categories: [],
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [level, setLevel] = useState<TicketTotalsLevel>(0);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [technicianId, setTechnicianId] = useState(0);
  const [categoryId, setCategoryId] = useState(0);
  const [status, setStatus] = useState(0);
  const [detailPage, setDetailPage] = useState(1);
  const [chartType, setChartType] = useState<ReportChartType>('bar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTicketReportCatalog()
      .then((value) => {
        if (active) setCatalog(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(
    async (filters: TicketTotalsReportFilters = {}) => {
      try {
        setLoading(true);
        setError(null);
        const response = await loadReport(filters);
        const effectiveFilters = {
          startDate: response.period.startDate,
          endDate: response.period.endDate,
          level: response.level,
          clientId: 0,
          clientIds: filters.clientIds ?? [],
          technicianId: filters.technicianId ?? 0,
          categoryId: filters.categoryId ?? 0,
          status: filters.status ?? 0,
        };
        const detailResponse = await fetchTicketReportDetails(effectiveFilters);

        setData(response);
        setDetails(detailResponse);
        setStartDate(response.period.startDate);
        setEndDate(response.period.endDate);
        setLevel(response.level);
        setClientIds(effectiveFilters.clientIds.map(String));
        setTechnicianId(effectiveFilters.technicianId);
        setCategoryId(effectiveFilters.categoryId);
        setStatus(effectiveFilters.status);
        setDetailPage(1);
      } catch (reason: unknown) {
        setData(null);
        setDetails(null);
        if (reason instanceof ApiError && reason.status === 401) {
          setError('Sua sessão expirou. Entre novamente.');
        } else if (reason instanceof ApiError && reason.status === 403) {
          setError('Seu usuário não possui acesso aos relatórios de atendimento.');
        } else {
          setError(loadErrorMessage);
        }
      } finally {
        setLoading(false);
      }
    },
    [loadErrorMessage, loadReport],
  );

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const selectedLevel = Number(query.get('level') ?? 0);
    void load({
      startDate: query.get('startDate') ?? undefined,
      endDate: query.get('endDate') ?? undefined,
      level: ([0, 1, 2, 3].includes(selectedLevel)
        ? selectedLevel
        : 0) as TicketTotalsLevel,
      clientIds: (query.get('clientIds') ?? query.get('clientId') ?? '')
        .split(',')
        .map((value) => Number(value))
        .filter((value) => Number.isSafeInteger(value) && value > 0),
      technicianId: Number(query.get('technicianId') ?? 0),
      categoryId: Number(query.get('categoryId') ?? 0),
      status: Number(query.get('status') ?? 0),
    });
  }, [load]);

  const chartRows = useMemo(
    () =>
      (data?.rows ?? []).map((row) => ({
        key: String(row.id),
        label: row.name,
        level1: row.level1,
        level2: row.level2,
        level3: row.level3,
        total: row.total,
      })),
    [data],
  );

  const totalPages = Math.max(
    1,
    Math.ceil((details?.rows.length ?? 0) / PAGE_SIZE),
  );
  const detailRows = useMemo(
    () =>
      (details?.rows ?? []).slice(
        (detailPage - 1) * PAGE_SIZE,
        detailPage * PAGE_SIZE,
      ),
    [detailPage, details],
  );

  function currentFilters(): TicketTotalsReportFilters {
    return {
      startDate,
      endDate,
      level,
      clientIds: clientIds.map(Number),
      technicianId,
      categoryId,
      status,
    };
  }

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(currentFilters());
  }

  function clear() {
    setClientIds([]);
    setTechnicianId(0);
    setCategoryId(0);
    setStatus(0);
    void load({ level: 0 });
  }

  function exportCsv() {
    if (!data) return;
    downloadCsv(
      `relatorio-${data.period.startDate}-${data.period.endDate}.csv`,
      [
        [title, 'Nível 1', 'Nível 2', 'Nível 3', 'Total'],
        ...data.rows.map((row) => [
          row.name,
          row.level1,
          row.level2,
          row.level3,
          row.total,
        ]),
      ],
    );
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text print:bg-white print:text-black">
      <AppPageHeader subtitle={description} title={title} user={currentUser} />

      <div className="mx-auto w-full max-w-[1550px] px-5 py-5 max-sm:px-3 print:max-w-none print:p-0">
        <form
          className="mb-4 grid grid-cols-6 items-end gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm max-[1200px]:grid-cols-3 max-[720px]:grid-cols-1 print:hidden"
          onSubmit={apply}
        >
          <div className="col-span-2 max-[1200px]:col-span-3 max-[720px]:col-span-1">
            <span className="mb-1.5 block text-xs font-bold text-app-muted">
              Período
            </span>
            <DateRangePicker
              disabled={loading}
              endDate={endDate}
              onChange={(range) => {
                setStartDate(range.startDate);
                setEndDate(range.endDate);
              }}
              startDate={startDate}
            />
          </div>

          <label className="grid gap-1.5 text-xs font-bold text-app-muted">
            Nível
            <SearchSelect
              disabled={loading}
              options={[
                { value: '1', label: 'Nível 1' },
                { value: '2', label: 'Nível 2' },
                { value: '3', label: 'Nível 3' },
              ]}
              onChange={(values) =>
                setLevel(Number(values[0] ?? 0) as TicketTotalsLevel)
              }
              placeholder="Todos"
              searchable={false}
              value={level ? [String(level)] : []}
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-app-muted">
            Clientes
            <SearchSelect
              disabled={loading}
              multiple
              multipleLabel="clientes selecionados"
              onChange={setClientIds}
              options={catalog.clients.map((row) => ({
                value: String(row.id),
                label: row.name,
              }))}
              placeholder="Todos os clientes"
              searchPlaceholder="Pesquisar cliente..."
              value={clientIds}
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-app-muted">
            Técnico
            <SearchSelect
              disabled={loading}
              onChange={(values) => setTechnicianId(Number(values[0] ?? 0))}
              options={catalog.technicians.map((row) => ({
                value: String(row.id),
                label: row.name,
              }))}
              placeholder="Todos os técnicos"
              searchPlaceholder="Pesquisar técnico..."
              value={technicianId ? [String(technicianId)] : []}
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-app-muted">
            Categoria
            <SearchSelect
              disabled={loading}
              onChange={(values) => setCategoryId(Number(values[0] ?? 0))}
              options={catalog.categories.map((row) => ({
                value: String(row.id),
                label: row.name,
              }))}
              placeholder="Todas as categorias"
              searchPlaceholder="Pesquisar categoria..."
              value={categoryId ? [String(categoryId)] : []}
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-app-muted">
            Status
            <SearchSelect
              disabled={loading}
              onChange={(values) => setStatus(Number(values[0] ?? 0))}
              options={Object.entries(STATUS).map(([value, label]) => ({
                value,
                label,
              }))}
              placeholder="Todos os status"
              searchable={false}
              value={status ? [String(status)] : []}
            />
          </label>

          <div className="col-span-5 flex flex-wrap justify-end gap-2 max-[1200px]:col-span-2 max-[720px]:col-span-1">
            <button className={PRIMARY} disabled={loading} type="submit">
              {loading ? 'Atualizando…' : 'Filtrar'}
            </button>
            <button className={SECONDARY} disabled={loading} onClick={clear} type="button">
              Limpar
            </button>
          </div>
        </form>

        {error ? (
          <div className="mb-4 rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft px-5 py-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-app-brand">Relatório</span>
              <h2 className="m-0 mt-1 text-lg font-extrabold">{chartTitle}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <ReportChartTypePicker
                onChange={setChartType}
                value={chartType}
              />
              <span className="rounded-full border border-app-brand/30 bg-app-brand-soft px-3 py-1.5 text-xs font-extrabold text-app-brand">
                Total selecionado: {(data?.total ?? 0).toLocaleString('pt-BR')}
              </span>
              <button className={SECONDARY} disabled={!data || loading} onClick={exportCsv} type="button">Exportar CSV</button>
              <button className={SECONDARY} disabled={!data || loading} onClick={() => window.print()} type="button">Imprimir / PDF</button>
            </div>
          </header>
          <div className="p-4">
            {loading && !data ? (
              <div className="grid min-h-[360px] place-items-center text-sm text-app-muted">Carregando relatório…</div>
            ) : (
              <ReportChartView
                emptyMessage={emptyMessage}
                rows={chartRows}
                type={chartType}
              />
            )}
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft px-5 py-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-app-brand">Detalhes</span>
              <h2 className="m-0 mt-1 text-base font-extrabold">Chamados da seleção</h2>
            </div>
            <span className="text-xs font-bold text-app-muted">
              {(details?.total ?? 0).toLocaleString('pt-BR')} chamado(s)
            </span>
          </header>

          <div className="max-h-[620px] overflow-auto">
            <table className="w-full min-w-[1180px] border-collapse">
              <thead className="sticky top-0 z-10 bg-app-surface-muted">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-extrabold uppercase text-app-muted">Chamado</th>
                  <th className="px-3 py-3 text-left text-xs font-extrabold uppercase text-app-muted">Abertura</th>
                  <th className="px-3 py-3 text-left text-xs font-extrabold uppercase text-app-muted">Cliente / solicitante</th>
                  <th className="px-3 py-3 text-left text-xs font-extrabold uppercase text-app-muted">Técnico</th>
                  <th className="px-3 py-3 text-left text-xs font-extrabold uppercase text-app-muted">Categoria</th>
                  <th className="px-3 py-3 text-center text-xs font-extrabold uppercase text-app-muted">Nível</th>
                  <th className="px-3 py-3 text-left text-xs font-extrabold uppercase text-app-muted">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-extrabold uppercase text-app-muted">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map((row) => (
                  <tr className="border-t border-app-border-soft align-top hover:bg-app-surface-hover" key={row.id}>
                    <td className="px-3 py-3 text-sm font-bold text-app-brand">#{row.id}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm">{openedAt(row.openedAt)}</td>
                    <td className="px-3 py-3 text-sm">
                      <strong className="block">{row.clientName}</strong>
                      <span className="text-xs text-app-muted">{row.requesterName || 'Não informado'}</span>
                    </td>
                    <td className="px-3 py-3 text-sm">{row.technicianName}</td>
                    <td className="px-3 py-3 text-sm">{row.categoryName || 'Sem categoria'}</td>
                    <td className="px-3 py-3 text-center text-sm font-bold">N{row.level}</td>
                    <td className="px-3 py-3 text-sm">{STATUS[row.status] ?? row.status}</td>
                    <td className="max-w-[460px] px-3 py-3 text-sm leading-5">{row.openingDescription}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !detailRows.length ? (
              <div className="p-8 text-center text-sm text-app-muted">Nenhum chamado para os filtros selecionados.</div>
            ) : null}
          </div>

          {(details?.rows.length ?? 0) > PAGE_SIZE ? (
            <footer className="flex items-center justify-between gap-3 border-t border-app-border-soft px-4 py-3">
              <span className="text-xs text-app-muted">
                Página {detailPage} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button className={SECONDARY} disabled={detailPage <= 1} onClick={() => setDetailPage((page) => Math.max(1, page - 1))} type="button">Anterior</button>
                <button className={SECONDARY} disabled={detailPage >= totalPages} onClick={() => setDetailPage((page) => Math.min(totalPages, page + 1))} type="button">Próxima</button>
              </div>
            </footer>
          ) : null}
        </section>
      </div>
    </main>
  );
}

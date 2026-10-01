"use client";

import {
  TICKET_STATUS_LABELS,
  type CurrentUserResponse,
  type TicketAnalyticsResponse,
  type TicketBreakdownLevel,
  type TicketBreakdownMode,
  type TicketBreakdownReportResponse,
  type TicketReportCatalog,
} from '@helpdesk/contracts';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { DateRangePicker } from '../../../shared/ui/date-range-picker';
import { appButtonClass } from '../../../shared/ui/button-styles';
import { SearchSelect } from '../../../shared/ui/search-select';
import {
  fetchTicketBreakdownReport,
  fetchTicketReportCatalog,
  fetchTicketReportDetails,
} from '../api/reports-api';
import {
  ReportChartTypePicker,
  ReportChartView,
  type ReportChartType,
} from './report-chart-view';

const PRIMARY = appButtonClass('primary');
const SECONDARY = appButtonClass('secondary');
const STATUS = TICKET_STATUS_LABELS as Readonly<Record<number, string>>;
const PAGE_SIZE = 100;

const CONFIG: Record<
  TicketBreakdownMode,
  {
    title: string;
    subtitle: string;
    chartTitle: string;
    entityLabel: string;
  }
> = {
  'client-daily': {
    title: 'Atendimentos diários por Cliente',
    subtitle: 'Consulte até 31 dias e filtre por cliente para analisar os chamados de cada dia.',
    chartTitle: 'Chamados por dia',
    entityLabel: 'Cliente',
  },
  requester: {
    title: 'Atendimentos por Solicitante',
    subtitle: 'Consulte o volume e os chamados abertos por cada solicitante.',
    chartTitle: 'Totais por solicitante',
    entityLabel: 'Solicitante',
  },
  'technician-daily': {
    title: 'Atendimentos diários por Técnico',
    subtitle: 'Consulte até 31 dias e filtre por técnico para analisar os chamados de cada dia.',
    chartTitle: 'Chamados por dia',
    entityLabel: 'Técnico',
  },
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

function formatOpened(value: string): string {
  const [date = '', time = ''] = value.replace('T', ' ').split(' ');
  return `${formatDate(date)} ${time.slice(0, 5)}`;
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.status === 403)
      return 'Seu usuário não possui acesso a este relatório.';
    if (reason.status === 401)
      return 'Sua sessão expirou. Entre novamente para continuar.';
  }
  return reason instanceof Error
    ? reason.message
    : 'Não foi possível carregar o relatório.';
}

export function TicketBreakdownReportScreen({
  currentUser,
  mode,
}: {
  currentUser: CurrentUserResponse;
  mode: TicketBreakdownMode;
}) {
  const config = CONFIG[mode];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [level, setLevel] = useState<TicketBreakdownLevel>(0);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [technicianId, setTechnicianId] = useState(0);
  const [categoryId, setCategoryId] = useState(0);
  const [status, setStatus] = useState(0);
  const [catalog, setCatalog] = useState<TicketReportCatalog>({
    clients: [],
    locations: [],
    technicians: [],
    categories: [],
  });
  const [applied, setApplied] = useState({
    startDate: firstDayOfMonth(),
    endDate: today(),
    level: 0 as TicketBreakdownLevel,
    clientId: 0,
    clientIds: [] as number[],
    technicianId: 0,
    categoryId: 0,
    status: 0,
  });
  const [result, setResult] =
    useState<TicketBreakdownReportResponse | null>(null);
  const [details, setDetails] = useState<TicketAnalyticsResponse | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const [chartType, setChartType] = useState<ReportChartType>('bar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchTicketReportCatalog()
      .then((response) => {
        if (active) setCatalog(response);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      fetchTicketBreakdownReport(mode, applied),
      fetchTicketReportDetails(applied),
    ])
      .then(([breakdown, detailResponse]) => {
        if (!active) return;
        setResult(breakdown);
        setDetails(detailResponse);
        setDetailPage(1);
      })
      .catch((reason) => {
        if (active) {
          setResult(null);
          setDetails(null);
          setError(errorMessage(reason));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, applied]);

  const chartRows = useMemo(() => {
    if (!result) return [];

    if (mode === 'requester') {
      return result.rows.slice(0, 24).map((row) => ({
        key: row.key,
        label: row.label,
        level1: row.level1,
        level2: row.level2,
        level3: row.level3,
        total: row.total,
      }));
    }

    const byDate = new Map<
      string,
      { level1: number; level2: number; level3: number; total: number }
    >();

    for (const row of result.rows) {
      const date = row.date ?? 'Sem data';
      const current = byDate.get(date) ?? {
        level1: 0,
        level2: 0,
        level3: 0,
        total: 0,
      };
      current.level1 += row.level1;
      current.level2 += row.level2;
      current.level3 += row.level3;
      current.total += row.total;
      byDate.set(date, current);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        key: date,
        label: formatDate(date),
        ...values,
      }));
  }, [mode, result]);

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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplied({
      startDate,
      endDate,
      level,
      clientId: 0,
      clientIds: clientIds.map(Number),
      technicianId,
      categoryId,
      status,
    });
  }

  function clear() {
    const next = {
      startDate: firstDayOfMonth(),
      endDate: today(),
      level: 0 as TicketBreakdownLevel,
      clientId: 0,
      clientIds: [] as number[],
      technicianId: 0,
      categoryId: 0,
      status: 0,
    };
    setStartDate(next.startDate);
    setEndDate(next.endDate);
    setLevel(0);
    setClientIds([]);
    setTechnicianId(0);
    setCategoryId(0);
    setStatus(0);
    setApplied(next);
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        subtitle={config.subtitle}
        title={config.title}
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1550px] px-5 py-5 max-sm:px-3.5">
        <form
          className="mb-4 grid grid-cols-6 items-end gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm max-[1200px]:grid-cols-3 max-[720px]:grid-cols-1"
          onSubmit={submit}
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
            Nível
            <SearchSelect
              disabled={loading}
              onChange={(values) =>
                setLevel(Number(values[0] ?? 0) as TicketBreakdownLevel)
              }
              options={[
                { value: '1', label: 'Nível 1' },
                { value: '2', label: 'Nível 2' },
                { value: '3', label: 'Nível 3' },
              ]}
              placeholder="Todos"
              searchable={false}
              value={level ? [String(level)] : []}
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

          <div className="col-span-5 flex justify-end gap-2 max-[1200px]:col-span-2 max-[720px]:col-span-1">
            <button className={PRIMARY} disabled={loading} type="submit">
              {loading ? 'Atualizando…' : 'Filtrar'}
            </button>
            <button className={SECONDARY} disabled={loading} onClick={clear} type="button">
              Limpar
            </button>
          </div>
        </form>

        {error ? (
          <div className="mb-4 rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger" role="alert">
            {error}
          </div>
        ) : null}

        {mode === 'requester' ? (
          <div className="mb-4 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div className="rounded-2xl border border-app-border bg-app-surface p-4 text-center shadow-sm">
              <span className="text-xs text-app-muted">Atendimentos no período</span>
              <strong className="mt-1 block text-2xl">{(result?.total ?? 0).toLocaleString('pt-BR')}</strong>
            </div>
            <div className="rounded-2xl border border-app-border bg-app-surface p-4 text-center shadow-sm">
              <span className="text-xs text-app-muted">Solicitantes</span>
              <strong className="mt-1 block text-2xl">{(result?.rows.length ?? 0).toLocaleString('pt-BR')}</strong>
            </div>
          </div>
        ) : null}

        <section className="mb-4 overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft px-5 py-4">
            <h2 className="m-0 text-lg font-extrabold">{config.chartTitle}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {mode === 'requester' ? (
                <ReportChartTypePicker
                  onChange={setChartType}
                  value={chartType}
                />
              ) : null}
              <span className="rounded-full border border-app-brand/30 bg-app-brand-soft px-3 py-1.5 text-xs font-extrabold text-app-brand">
                Total selecionado: {(result?.total ?? 0).toLocaleString('pt-BR')}
              </span>
            </div>
          </header>
          <div className="p-4">
            {loading && !result ? (
              <div className="grid min-h-[360px] place-items-center text-sm text-app-muted">Carregando relatório…</div>
            ) : (
              <ReportChartView
                emptyMessage="Nenhum atendimento encontrado no período informado."
                rows={chartRows}
                type={mode === 'requester' ? chartType : 'bar'}
              />
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
          <header className="flex items-center justify-between gap-3 border-b border-app-border-soft px-5 py-4">
            <h2 className="m-0 text-base font-extrabold">
              {mode === 'requester' ? 'Solicitações do período' : 'Chamados do período'}
            </h2>
            <span className="text-xs font-bold text-app-muted">{(details?.total ?? 0).toLocaleString('pt-BR')} chamado(s)</span>
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
                    <td className="whitespace-nowrap px-3 py-3 text-sm">{formatOpened(row.openedAt)}</td>
                    <td className="px-3 py-3 text-sm"><strong className="block">{row.clientName}</strong><span className="text-xs text-app-muted">{row.requesterName || 'Não informado'}</span></td>
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
              <span className="text-xs text-app-muted">Página {detailPage} de {totalPages}</span>
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

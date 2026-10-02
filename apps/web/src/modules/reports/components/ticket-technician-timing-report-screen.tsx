"use client";

import {
  AppPermission,
  TICKET_STATUS_LABELS,
  type CurrentUserResponse,
  type TicketReportCatalog,
  type TicketTechnicianTimingResponse,
} from '@helpdesk/contracts';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { DateRangePicker } from '../../../shared/ui/date-range-picker';
import { SearchSelect } from '../../../shared/ui/search-select';
import { appButtonClass } from '../../../shared/ui/button-styles';
import {
  fetchTicketReportCatalog,
  fetchTicketTechnicianTimingReport,
} from '../api/reports-api';
import { downloadCsv } from '../lib/report-export';

const PRIMARY = appButtonClass('primary');
const SECONDARY = appButtonClass('secondary');
const STATUS = TICKET_STATUS_LABELS as Readonly<Record<number, string>>;

function duration(seconds: number | null): string {
  if (seconds === null) return '—';
  const total = Math.max(0, Math.round(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function dateTime(value: string | null): string {
  if (!value) return '—';
  const [date = '', time = ''] = value.replace('T', ' ').split(' ');
  const [year, month, day] = date.split('-');
  return year && month && day
    ? `${day}/${month}/${year} ${time.slice(0, 5)}`
    : value;
}

function metricWidth(value: number | null, max: number): string {
  if (value === null || max <= 0) return '0%';
  return `${Math.max(2, Math.min(100, (value / max) * 100))}%`;
}

export function TicketTechnicianTimingReportScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [catalog, setCatalog] = useState<TicketReportCatalog>({
    clients: [],
    locations: [],
    technicians: [],
    categories: [],
  });
  const [data, setData] = useState<TicketTechnicianTimingResponse | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [technicianIds, setTechnicianIds] = useState<string[]>([]);
  const [level, setLevel] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canGeneratePdf = currentUser.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.ReportsPdf,
  );

  async function load(filters?: {
    startDate?: string;
    endDate?: string;
    clientIds?: number[];
    technicianIds?: number[];
    level?: number;
  }) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchTicketTechnicianTimingReport(filters);
      setData(response);
      setStartDate(response.filters.startDate);
      setEndDate(response.filters.endDate);
      setClientIds(response.filters.clientIds.map(String));
      setTechnicianIds(response.filters.technicianIds.map(String));
      setLevel(String(response.filters.level || 0));
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 403) {
        setError('Seu usuário não possui acesso aos relatórios.');
      } else if (reason instanceof ApiError && reason.status === 401) {
        setError('Sua sessão expirou. Entre novamente.');
      } else {
        setError('Não foi possível carregar o relatório de tempos por técnico.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetchTicketReportCatalog()
      .then((value) => {
        if (active) setCatalog(value);
      })
      .catch(() => undefined);
    void load();
    return () => {
      active = false;
    };
  }, []);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load({
      startDate,
      endDate,
      clientIds: clientIds.map(Number),
      technicianIds: technicianIds.map(Number),
      level: Number(level),
    });
  }

  function clear() {
    setClientIds([]);
    setTechnicianIds([]);
    setLevel('0');
    void load();
  }

  const chartMax = useMemo(
    () =>
      Math.max(
        1,
        ...(data?.rows ?? []).flatMap((row) => [
          row.averageAcceptanceSeconds ?? 0,
          row.averageHandlingSeconds ?? 0,
          row.averageResolutionSeconds ?? 0,
        ]),
      ),
    [data],
  );

  function exportCsv() {
    if (!data) return;
    downloadCsv(
      `tempo-tecnicos-${data.filters.startDate}-${data.filters.endDate}.csv`,
      [
        [
          'Técnico',
          'Chamados',
          'Aceitos',
          'Concluídos',
          'Tempo médio para aceitar',
          'Tempo médio aceite → conclusão',
          'Tempo médio abertura → conclusão',
          'Maior tempo para aceitar',
          'Maior tempo para concluir',
        ],
        ...data.rows.map((row) => [
          row.technicianName,
          row.ticketCount,
          row.acceptedCount,
          row.completedCount,
          duration(row.averageAcceptanceSeconds),
          duration(row.averageHandlingSeconds),
          duration(row.averageResolutionSeconds),
          duration(row.maxAcceptanceSeconds),
          duration(row.maxResolutionSeconds),
        ]),
      ],
    );
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text print:bg-white print:text-black">
      <AppPageHeader
        subtitle="Compare quanto tempo cada técnico leva para aceitar e concluir os atendimentos."
        title="Tempo de aceite e conclusão"
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1550px] px-5 py-5 max-sm:px-3 print:max-w-none print:p-0">
        <form
          className="mb-4 grid grid-cols-6 items-end gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm max-[1200px]:grid-cols-3 max-[720px]:grid-cols-1 print:hidden"
          onSubmit={apply}
        >
          <div className="col-span-2 max-[1200px]:col-span-3 max-[720px]:col-span-1">
            <span className="mb-1.5 block text-xs font-bold text-app-muted">
              Período de abertura
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
            Técnicos
            <SearchSelect
              disabled={loading}
              multiple
              multipleLabel="técnicos selecionados"
              onChange={setTechnicianIds}
              options={catalog.technicians.map((row) => ({
                value: String(row.id),
                label: row.name,
              }))}
              placeholder="Todos os técnicos"
              searchPlaceholder="Pesquisar técnico..."
              value={technicianIds}
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-app-muted">
            Nível
            <SearchSelect
              disabled={loading}
              onChange={(values) => setLevel(values[0] ?? '0')}
              options={[
                { value: '1', label: 'Nível 1' },
                { value: '2', label: 'Nível 2' },
                { value: '3', label: 'Nível 3' },
              ]}
              placeholder="Todos"
              searchable={false}
              value={level === '0' ? [] : [level]}
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2">
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

        <section className="grid grid-cols-5 gap-3 max-[1100px]:grid-cols-2 max-[620px]:grid-cols-1">
          {[
            ['Chamados', data?.totalTickets ?? 0, 'no período'],
            ['Aceitos', data?.acceptedTickets ?? 0, 'com registro de aceite'],
            ['Concluídos', data?.completedTickets ?? 0, 'com fechamento'],
            ['Média para aceitar', duration(data?.averageAcceptanceSeconds ?? null), 'abertura → aceite'],
            ['Média para concluir', duration(data?.averageResolutionSeconds ?? null), 'abertura → conclusão'],
          ].map(([label, value, helper]) => (
            <article className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm" key={String(label)}>
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-app-muted">{label}</span>
              <strong className="mt-2 block text-2xl">{value}</strong>
              <span className="mt-1 block text-xs text-app-subtle">{helper}</span>
            </article>
          ))}
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft px-5 py-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-app-brand">Comparativo</span>
              <h2 className="m-0 mt-1 text-lg font-extrabold">Tempo médio por técnico</h2>
            </div>
            <div className="flex gap-2 print:hidden">
              <button className={SECONDARY} disabled={!data || loading} onClick={exportCsv} type="button">Exportar CSV</button>
              {canGeneratePdf ? (
                <button className={SECONDARY} disabled={!data || loading} onClick={() => window.print()} type="button">Imprimir / PDF</button>
              ) : null}
            </div>
          </header>

          <div className="grid gap-3 p-4">
            {!loading && !(data?.rows.length) ? (
              <div className="grid min-h-[220px] place-items-center text-sm text-app-muted">
                Nenhum chamado encontrado para os filtros selecionados.
              </div>
            ) : (
              data?.rows.map((row) => (
                <article className="rounded-xl border border-app-border p-3.5" key={row.technicianId}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong className="block">{row.technicianName}</strong>
                      <span className="text-xs text-app-muted">
                        {row.ticketCount} chamado(s) · {row.acceptedCount} aceito(s) · {row.completedCount} concluído(s)
                      </span>
                    </div>
                    <span className="rounded-full bg-app-surface-muted px-2.5 py-1 text-xs font-bold text-app-muted-strong">
                      Média total: {duration(row.averageResolutionSeconds)}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {[
                      ['Aceite', row.averageAcceptanceSeconds, 'bg-sky-500'],
                      ['Aceite → conclusão', row.averageHandlingSeconds, 'bg-amber-500'],
                      ['Abertura → conclusão', row.averageResolutionSeconds, 'bg-emerald-500'],
                    ].map(([label, value, barClass]) => (
                      <div className="grid grid-cols-[150px_minmax(0,1fr)_110px] items-center gap-3 max-[700px]:grid-cols-1" key={String(label)}>
                        <span className="text-xs font-bold text-app-muted">{label}</span>
                        <div className="h-3 overflow-hidden rounded-full bg-app-surface-muted">
                          <div
                            className={`h-full rounded-full ${barClass}`}
                            style={{ width: metricWidth(value as number | null, chartMax) }}
                          />
                        </div>
                        <span className="text-right text-xs font-extrabold max-[700px]:text-left">
                          {duration(value as number | null)}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
          <header className="border-b border-app-border-soft px-5 py-4">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-app-brand">Detalhes</span>
            <h2 className="m-0 mt-1 text-lg font-extrabold">Chamados do período</h2>
          </header>
          <div className="max-h-[680px] overflow-auto">
            <table className="w-full min-w-[1350px] border-collapse">
              <thead className="sticky top-0 z-10 bg-app-surface-muted">
                <tr>
                  {[
                    'Chamado',
                    'Cliente / solicitante',
                    'Técnico',
                    'Nível',
                    'Status',
                    'Abertura',
                    'Aceite',
                    'Conclusão',
                    'Até aceitar',
                    'Aceite → conclusão',
                    'Total',
                  ].map((label) => (
                    <th className="px-3 py-3 text-left text-xs font-extrabold uppercase text-app-muted" key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.details.map((row) => (
                  <tr className="border-t border-app-border-soft hover:bg-app-surface-hover" key={row.ticketId}>
                    <td className="px-3 py-3 text-sm font-bold text-app-brand">#{row.ticketId}</td>
                    <td className="px-3 py-3 text-sm">
                      <strong className="block">{row.clientName}</strong>
                      <span className="text-xs text-app-muted">{row.requesterName || 'Sem solicitante'}</span>
                    </td>
                    <td className="px-3 py-3 text-sm font-semibold">{row.technicianName}</td>
                    <td className="px-3 py-3 text-sm">N{row.level}</td>
                    <td className="px-3 py-3 text-sm">{STATUS[row.status] ?? `Status ${row.status}`}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm">{dateTime(row.openedAt)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm">{dateTime(row.acceptedAt)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm">{dateTime(row.closedAt)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm font-semibold">{duration(row.acceptanceSeconds)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm font-semibold">{duration(row.handlingSeconds)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm font-extrabold">{duration(row.resolutionSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-3 text-xs text-app-muted print:hidden">
          O tempo para aceitar é calculado da abertura até o primeiro registro de Aceite do técnico atualmente responsável pelo chamado. O tempo para concluir usa o fechamento do chamado.
        </p>
      </div>
    </main>
  );
}

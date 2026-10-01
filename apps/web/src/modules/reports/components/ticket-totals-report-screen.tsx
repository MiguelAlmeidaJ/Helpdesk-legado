"use client";

import type { CurrentUserResponse } from '@helpdesk/contracts';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { DateRangePicker } from '../../../shared/ui/date-range-picker';
import { appButtonClass } from '../../../shared/ui/button-styles';
import { downloadCsv } from '../lib/report-export';
import { ReportStackedBarChart } from './report-stacked-bar-chart';

export type TicketTotalsLevel = 0 | 1 | 2 | 3;

export interface TicketTotalsReportFilters {
  startDate?: string;
  endDate?: string;
  level?: TicketTotalsLevel;
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
const CONTROL =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)]';

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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [level, setLevel] = useState<TicketTotalsLevel>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (filters: TicketTotalsReportFilters = {}) => {
      try {
        setLoading(true);
        setError(null);
        const response = await loadReport(filters);
        setData(response);
        setStartDate(response.period.startDate);
        setEndDate(response.period.endDate);
        setLevel(response.level);
      } catch (reason: unknown) {
        setData(null);
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

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load({ startDate, endDate, level });
  }

  function clear() {
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
        [
          'Total',
          data.rows.reduce((sum, row) => sum + row.level1, 0),
          data.rows.reduce((sum, row) => sum + row.level2, 0),
          data.rows.reduce((sum, row) => sum + row.level3, 0),
          data.total,
        ],
      ],
    );
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text print:bg-white print:text-black">
      <AppPageHeader subtitle={description} title={title} user={currentUser} />

      <div className="mx-auto w-full max-w-[1500px] px-5 py-5 max-sm:px-3 print:max-w-none print:p-0">
        <form
          className="mb-4 grid grid-cols-[minmax(280px,1.4fr)_180px_auto] items-end gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm max-[760px]:grid-cols-1 print:hidden"
          onSubmit={apply}
        >
          <div>
            <span className="mb-1.5 block text-xs font-bold text-app-muted">Período</span>
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
            <select
              className={CONTROL}
              disabled={loading}
              onChange={(event) =>
                setLevel(Number(event.target.value) as TicketTotalsLevel)
              }
              value={level}
            >
              <option value={0}>Todos</option>
              <option value={1}>Nível 1</option>
              <option value={2}>Nível 2</option>
              <option value={3}>Nível 3</option>
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
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
              <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-app-brand">
                Relatório
              </span>
              <h2 className="m-0 mt-1 text-lg font-extrabold">{chartTitle}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <span className="rounded-full border border-app-brand/30 bg-app-brand-soft px-3 py-1.5 text-xs font-extrabold text-app-brand">
                Total selecionado: {(data?.total ?? 0).toLocaleString('pt-BR')}
              </span>
              <button className={SECONDARY} disabled={!data || loading} onClick={exportCsv} type="button">
                Exportar CSV
              </button>
              <button className={SECONDARY} disabled={!data || loading} onClick={() => window.print()} type="button">
                Imprimir / PDF
              </button>
            </div>
          </header>

          <div className="p-4">
            {loading && !data ? (
              <div className="grid min-h-[360px] place-items-center text-sm text-app-muted">
                Carregando relatório…
              </div>
            ) : (
              <ReportStackedBarChart rows={chartRows} emptyMessage={emptyMessage} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

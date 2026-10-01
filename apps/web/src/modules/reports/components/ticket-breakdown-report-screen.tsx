"use client";

import type {
  CurrentUserResponse,
  TicketBreakdownLevel,
  TicketBreakdownMode,
  TicketBreakdownReportResponse,
} from '@helpdesk/contracts';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { DateRangePicker } from '../../../shared/ui/date-range-picker';
import { appButtonClass } from '../../../shared/ui/button-styles';
import { fetchTicketBreakdownReport } from '../api/reports-api';
import { ReportStackedBarChart } from './report-stacked-bar-chart';

const PRIMARY = appButtonClass('primary');
const SECONDARY = appButtonClass('secondary');
const INPUT =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)]';

const CONFIG: Record<
  TicketBreakdownMode,
  {
    title: string;
    subtitle: string;
    chartTitle: string;
    entityLabel: string;
    showDate: boolean;
  }
> = {
  'client-daily': {
    title: 'Atendimentos diários por Cliente',
    subtitle: 'Consulte o volume diário e acompanhe a distribuição por nível.',
    chartTitle: 'Chamados por dia',
    entityLabel: 'Cliente',
    showDate: true,
  },
  requester: {
    title: 'Atendimentos por Solicitante',
    subtitle: 'Consulte o volume e a distribuição de chamados abertos por solicitante.',
    chartTitle: 'Totais por solicitante',
    entityLabel: 'Solicitante',
    showDate: false,
  },
  'technician-daily': {
    title: 'Atendimentos diários por Técnico',
    subtitle: 'Consulte o volume diário e acompanhe a distribuição por nível.',
    chartTitle: 'Chamados por dia',
    entityLabel: 'Técnico',
    showDate: true,
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
  const [applied, setApplied] = useState({
    startDate: firstDayOfMonth(),
    endDate: today(),
    level: 0 as TicketBreakdownLevel,
  });
  const [result, setResult] =
    useState<TicketBreakdownReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchTicketBreakdownReport(mode, applied)
      .then((response) => {
        if (active) setResult(response);
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
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
      return result.rows.slice(0, 18).map((row) => ({
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplied({ startDate, endDate, level });
  }

  function clear() {
    const next = {
      startDate: firstDayOfMonth(),
      endDate: today(),
      level: 0 as TicketBreakdownLevel,
    };
    setStartDate(next.startDate);
    setEndDate(next.endDate);
    setLevel(0);
    setApplied(next);
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        subtitle={config.subtitle}
        title={config.title}
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1500px] px-5 py-5 max-sm:px-3.5">
        <form
          className="mb-4 grid grid-cols-[minmax(300px,1.5fr)_180px_auto] items-end gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm max-[760px]:grid-cols-1"
          onSubmit={submit}
        >
          <div>
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
            <select
              className={INPUT}
              disabled={loading}
              onChange={(event) =>
                setLevel(Number(event.target.value) as TicketBreakdownLevel)
              }
              value={level}
            >
              <option value="0">Todos</option>
              <option value="1">Nível 1</option>
              <option value="2">Nível 2</option>
              <option value="3">Nível 3</option>
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button className={PRIMARY} disabled={loading} type="submit">
              {loading ? 'Atualizando…' : 'Filtrar'}
            </button>
            <button
              className={SECONDARY}
              disabled={loading}
              onClick={clear}
              type="button"
            >
              Limpar
            </button>
          </div>
        </form>

        {error ? (
          <div
            className="mb-4 rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {mode === 'requester' ? (
          <div className="mb-4 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div className="rounded-2xl border border-app-border bg-app-surface p-4 text-center shadow-sm">
              <span className="text-xs text-app-muted">Atendimentos no período</span>
              <strong className="mt-1 block text-2xl">
                {(result?.total ?? 0).toLocaleString('pt-BR')}
              </strong>
            </div>
            <div className="rounded-2xl border border-app-border bg-app-surface p-4 text-center shadow-sm">
              <span className="text-xs text-app-muted">Solicitantes</span>
              <strong className="mt-1 block text-2xl">
                {(result?.rows.length ?? 0).toLocaleString('pt-BR')}
              </strong>
            </div>
          </div>
        ) : null}

        <section className="mb-4 overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft px-5 py-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-app-brand">
                Relatório
              </span>
              <h2 className="m-0 mt-1 text-lg font-extrabold">
                {config.chartTitle}
              </h2>
            </div>
            <span className="rounded-full border border-app-brand/30 bg-app-brand-soft px-3 py-1.5 text-xs font-extrabold text-app-brand">
              Total selecionado: {(result?.total ?? 0).toLocaleString('pt-BR')}
            </span>
          </header>

          <div className="p-4">
            {loading && !result ? (
              <div className="grid min-h-[360px] place-items-center text-sm text-app-muted">
                Carregando relatório…
              </div>
            ) : (
              <ReportStackedBarChart
                emptyMessage="Nenhum atendimento encontrado no período informado."
                rows={chartRows}
              />
            )}
          </div>
        </section>

        {mode === 'requester' ? (
          <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
            <header className="border-b border-app-border-soft px-5 py-4">
              <h2 className="m-0 text-base font-extrabold">Totais por solicitante</h2>
            </header>
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead className="sticky top-0 bg-app-surface-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase text-app-muted">
                      Solicitante
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-extrabold uppercase text-app-muted">N1</th>
                    <th className="px-4 py-3 text-right text-xs font-extrabold uppercase text-app-muted">N2</th>
                    <th className="px-4 py-3 text-right text-xs font-extrabold uppercase text-app-muted">N3</th>
                    <th className="px-4 py-3 text-right text-xs font-extrabold uppercase text-app-muted">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(result?.rows ?? []).map((row) => (
                    <tr className="border-t border-app-border-soft hover:bg-app-surface-hover" key={row.key}>
                      <td className="px-4 py-3 text-sm font-semibold">{row.label}</td>
                      <td className="px-4 py-3 text-right text-sm">{row.level1}</td>
                      <td className="px-4 py-3 text-right text-sm">{row.level2}</td>
                      <td className="px-4 py-3 text-right text-sm">{row.level3}</td>
                      <td className="px-4 py-3 text-right text-sm font-extrabold">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
            <header className="border-b border-app-border-soft px-5 py-4">
              <h2 className="m-0 text-base font-extrabold">
                Detalhamento por {config.entityLabel.toLowerCase()}
              </h2>
            </header>
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead className="sticky top-0 bg-app-surface-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase text-app-muted">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase text-app-muted">{config.entityLabel}</th>
                    <th className="px-4 py-3 text-right text-xs font-extrabold uppercase text-app-muted">N1</th>
                    <th className="px-4 py-3 text-right text-xs font-extrabold uppercase text-app-muted">N2</th>
                    <th className="px-4 py-3 text-right text-xs font-extrabold uppercase text-app-muted">N3</th>
                    <th className="px-4 py-3 text-right text-xs font-extrabold uppercase text-app-muted">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(result?.rows ?? []).map((row) => (
                    <tr className="border-t border-app-border-soft hover:bg-app-surface-hover" key={row.key}>
                      <td className="px-4 py-3 text-sm text-app-muted-strong">{formatDate(row.date)}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{row.label}</td>
                      <td className="px-4 py-3 text-right text-sm">{row.level1}</td>
                      <td className="px-4 py-3 text-right text-sm">{row.level2}</td>
                      <td className="px-4 py-3 text-right text-sm">{row.level3}</td>
                      <td className="px-4 py-3 text-right text-sm font-extrabold">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

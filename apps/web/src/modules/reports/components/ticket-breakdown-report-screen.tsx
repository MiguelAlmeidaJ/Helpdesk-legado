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
import { fetchTicketBreakdownReport } from '../api/reports-api';

const BUTTON =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft transition hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY = `${BUTTON} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;
const INPUT =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)]';

const CONFIG: Record<TicketBreakdownMode, {
  title: string;
  subtitle: string;
  entityLabel: string;
  showDate: boolean;
}> = {
  'client-daily': {
    title: 'Atendimentos diários por Cliente',
    subtitle: 'Acompanhe o volume diário de atendimentos por cliente e nível.',
    entityLabel: 'Cliente',
    showDate: true,
  },
  requester: {
    title: 'Atendimentos por Solicitante',
    subtitle: 'Compare o volume de atendimentos por solicitante no período.',
    entityLabel: 'Solicitante',
    showDate: false,
  },
  'technician-daily': {
    title: 'Atendimentos diários por Técnico',
    subtitle: 'Acompanhe o volume diário de atendimentos por técnico e nível.',
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
    if (reason.status === 403) return 'Seu usuário não possui acesso a este relatório.';
    if (reason.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
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
  const [result, setResult] = useState<TicketBreakdownReportResponse | null>(null);
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

  const maxTotal = useMemo(
    () => Math.max(1, ...(result?.rows.map((row) => row.total) ?? [1])),
    [result],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplied({ startDate, endDate, level });
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        meta={
          <span className="text-xs text-app-muted max-lg:hidden">
            {result ? `${result.total.toLocaleString('pt-BR')} atendimento(s)` : 'Carregando…'}
          </span>
        }
        subtitle={config.subtitle}
        title={config.title}
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1450px] px-6 py-6 max-sm:px-3.5">
        <form
          className="mb-4 grid gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm md:grid-cols-[1fr_1fr_180px_auto]"
          onSubmit={submit}
        >
          <label className="grid gap-1.5 text-xs font-bold text-app-muted">
            Data inicial
            <input className={INPUT} onChange={(event) => setStartDate(event.target.value)} required type="date" value={startDate} />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-app-muted">
            Data final
            <input className={INPUT} onChange={(event) => setEndDate(event.target.value)} required type="date" value={endDate} />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-app-muted">
            Nível
            <select className={INPUT} onChange={(event) => setLevel(Number(event.target.value) as TicketBreakdownLevel)} value={level}>
              <option value="0">Todos</option>
              <option value="1">Nível 1</option>
              <option value="2">Nível 2</option>
              <option value="3">Nível 3</option>
            </select>
          </label>
          <div className="flex items-end">
            <button className={PRIMARY} disabled={loading} type="submit">
              {loading ? 'Atualizando…' : 'Aplicar'}
            </button>
          </div>
        </form>

        {error ? (
          <div className="mb-4 rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger" role="alert">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse">
              <thead className="bg-app-surface-muted">
                <tr>
                  {config.showDate ? <th className="px-4 py-3 text-left text-xs font-black uppercase text-app-muted">Data</th> : null}
                  <th className="px-4 py-3 text-left text-xs font-black uppercase text-app-muted">{config.entityLabel}</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase text-app-muted">N1</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase text-app-muted">N2</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase text-app-muted">N3</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase text-app-muted">Total</th>
                </tr>
              </thead>
              <tbody>
                {(result?.rows ?? []).map((row) => (
                  <tr className="border-t border-app-border-soft hover:bg-app-surface-muted" key={row.key}>
                    {config.showDate ? <td className="px-4 py-3 text-sm text-app-muted-strong">{formatDate(row.date)}</td> : null}
                    <td className="px-4 py-3">
                      <div className="grid gap-1">
                        <strong className="text-sm">{row.label}</strong>
                        <div className="h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-app-border">
                          <div
                            className="h-full rounded-full bg-app-brand"
                            style={{ width: `${Math.max(4, Math.round((row.total / maxTotal) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{row.level1}</td>
                    <td className="px-4 py-3 text-right text-sm">{row.level2}</td>
                    <td className="px-4 py-3 text-right text-sm">{row.level3}</td>
                    <td className="px-4 py-3 text-right text-sm font-black">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !error && result?.rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-app-muted">
              Nenhum atendimento encontrado no período informado.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

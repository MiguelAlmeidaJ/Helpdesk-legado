"use client";

import type {
  CurrentUserResponse,
  FinanceListResponse,
  FinanceRow,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { NavigationIcon } from '../../../shared/navigation/navigation-icon';
import { fetchFinanceView } from '../api/finance-api';

const BUTTON =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover';
const PRIMARY =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-brand bg-app-brand px-4 text-sm font-bold text-app-brand-contrast no-underline transition hover:bg-app-brand-hover';
const INPUT =
  'min-h-10 rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)]';

type DashboardData = {
  accrual: FinanceListResponse;
  cashflow: FinanceListResponse;
  payables: FinanceListResponse;
};

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function money(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function dateLabel(value: string | null): string {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Seu usuário não possui acesso à Gestão de Contas.';
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
    if (error.body && typeof error.body === 'object') {
      const value = (error.body as Record<string, unknown>).message;
      if (typeof value === 'string') return value;
    }
    return `A API respondeu com erro ${error.status}.`;
  }
  return error instanceof Error ? error.message : 'Não foi possível carregar a Gestão de Contas.';
}

function dueRows(data: DashboardData): FinanceRow[] {
  return [...data.accrual.rows, ...data.payables.rows]
    .filter((row) => (row.balance ?? 0) > 0 && row.dueDate)
    .sort((left, right) => String(left.dueDate).localeCompare(String(right.dueDate)))
    .slice(0, 10);
}

function StatCard({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'negative'
        ? 'text-rose-700 dark:text-rose-300'
        : 'text-app-text';

  return <article className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10">
    <span className="text-xs font-extrabold uppercase tracking-[0.04em] text-app-muted">{label}</span>
    <strong className={`mt-2 block text-[1.55rem] leading-tight ${toneClass}`}>{value}</strong>
    <small className="mt-1 block text-xs text-app-subtle">{detail}</small>
  </article>;
}

function ViewCard({
  title,
  subtitle,
  href,
  icon,
  primary,
  secondary,
  count,
}: {
  title: string;
  subtitle: string;
  href: string;
  icon: 'chart' | 'wallet' | 'file';
  primary: string;
  secondary: string;
  count: number;
}) {
  return <article className="grid gap-4 rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10">
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-app-brand-soft text-app-brand">
        <NavigationIcon className="size-5" name={icon} />
      </span>
      <div className="min-w-0">
        <h3 className="m-0 text-base font-extrabold text-app-text">{title}</h3>
        <p className="m-0 mt-1 text-xs leading-relaxed text-app-muted">{subtitle}</p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 rounded-lg bg-app-surface-muted p-3">
      <div className="grid gap-1"><span className="text-[11px] font-bold uppercase text-app-subtle">Principal</span><strong className="text-sm">{primary}</strong></div>
      <div className="grid gap-1"><span className="text-[11px] font-bold uppercase text-app-subtle">Complemento</span><strong className="text-sm">{secondary}</strong></div>
    </div>
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-app-muted">{count} registro(s) no período</span>
      <Link className={BUTTON} href={href}>Abrir visão</Link>
    </div>
  </article>;
}

export function AccountManagementScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(isoToday);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const filters = { startDate, endDate };
      const [accrual, cashflow, payables] = await Promise.all([
        fetchFinanceView('receivables-accrual', filters, signal),
        fetchFinanceView('receivables-cashflow', filters, signal),
        fetchFinanceView('payables', filters, signal),
      ]);
      setData({ accrual, cashflow, payables });
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setError(errorMessage(reason));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [endDate, startDate]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const metrics = useMemo(() => {
    if (!data) return null;
    const openReceivables = data.accrual.summary.openReceivables;
    const received = data.cashflow.summary.inflow;
    const openPayables = data.payables.summary.openPayables;
    return {
      openReceivables,
      received,
      openPayables,
      projected: openReceivables - openPayables,
      due: dueRows(data),
    };
  }, [data]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (startDate > endDate) {
      setError('Data inicial não pode ser maior que a data final.');
      return;
    }
    await load();
  }

  return <main className="min-h-screen bg-app-bg text-app-text">
    <AppPageHeader
      actions={<Link className={PRIMARY} href="/logistica/financeiro/lancamentos"><NavigationIcon className="size-4" name="file" />Lançamentos</Link>}
      subtitle="Visão consolidada de recebimentos, contas em aberto e compromissos financeiros."
      title="Gestão de Contas"
      user={currentUser}
    />

    <div className="mx-auto grid w-full max-w-[1500px] gap-5 p-6 max-sm:px-3.5">
      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10" onSubmit={submit}>
        <label className="grid gap-1.5 text-xs font-bold text-app-muted">
          <span>De</span>
          <input className={INPUT} onChange={(event) => setStartDate(event.target.value)} required type="date" value={startDate} />
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-app-muted">
          <span>Até</span>
          <input className={INPUT} onChange={(event) => setEndDate(event.target.value)} required type="date" value={endDate} />
        </label>
        <button className={PRIMARY} disabled={loading} type="submit">{loading ? 'Atualizando…' : 'Atualizar dashboard'}</button>
      </form>

      {error ? <div className="rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger" role="alert">{error}</div> : null}

      {metrics && data ? <>
        <section className="grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2 max-[620px]:grid-cols-1">
          <StatCard label="A receber em aberto" value={money(metrics.openReceivables)} detail="Saldo das contas por competência no período." tone="positive" />
          <StatCard label="Recebido no período" value={money(metrics.received)} detail="Entradas efetivamente recebidas no intervalo." tone="positive" />
          <StatCard label="A pagar em aberto" value={money(metrics.openPayables)} detail="Compromissos ainda não baixados no período." tone="negative" />
          <StatCard label="Saldo projetado" value={money(metrics.projected)} detail="A receber em aberto menos contas a pagar em aberto." tone={metrics.projected >= 0 ? 'positive' : 'negative'} />
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-extrabold">Visões de contas</h2>
              <p className="m-0 mt-1 text-sm text-app-muted">As telas originais continuam disponíveis para consulta e operação detalhada.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 max-[1050px]:grid-cols-1">
            <ViewCard
              count={data.accrual.summary.count}
              href="/logistica/financeiro/contas-a-receber-competencia"
              icon="chart"
              primary={money(data.accrual.summary.openReceivables)}
              secondary={money(data.accrual.summary.inflow)}
              subtitle="Faturamento, vencimentos, saldos e recebimentos pela competência."
              title="Contas a Receber · Competência"
            />
            <ViewCard
              count={data.cashflow.summary.count}
              href="/logistica/financeiro/contas-a-receber-fluxo"
              icon="wallet"
              primary={money(data.cashflow.summary.inflow)}
              secondary={money(data.cashflow.summary.balance)}
              subtitle="Recebimentos efetivamente realizados no intervalo selecionado."
              title="Contas a Receber · Fluxo"
            />
            <ViewCard
              count={data.payables.summary.count}
              href="/logistica/financeiro/contas-a-pagar"
              icon="file"
              primary={money(data.payables.summary.openPayables)}
              secondary={money(data.payables.summary.outflow)}
              subtitle="Compromissos, vencimentos e baixas das contas a pagar."
              title="Contas a Pagar"
            />
          </div>
        </section>

        <section className="rounded-xl border border-app-border bg-app-surface shadow-sm shadow-slate-950/5 dark:shadow-black/10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-4 py-3">
            <div>
              <h2 className="m-0 text-base font-extrabold">Próximos vencimentos</h2>
              <p className="m-0 mt-1 text-xs text-app-muted">Contas em aberto dentro do período selecionado.</p>
            </div>
            <span className="rounded-full bg-app-surface-muted px-2.5 py-1 text-xs font-bold text-app-muted">{metrics.due.length} exibido(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-app-surface-muted text-left text-xs text-app-muted">
                <tr><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Cliente / Fornecedor</th><th className="px-4 py-3">Descrição</th><th className="px-4 py-3 text-right">Saldo</th></tr>
              </thead>
              <tbody>
                {metrics.due.map((row) => <tr className="border-t border-app-border-soft" key={row.id}>
                  <td className="whitespace-nowrap px-4 py-3">{dateLabel(row.dueDate)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[11px] font-extrabold ${row.kind === 'receivable' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}>{row.kind === 'receivable' ? 'A receber' : 'A pagar'}</span></td>
                  <td className="px-4 py-3 font-semibold">{row.party || '—'}</td>
                  <td className="px-4 py-3 text-app-muted">{row.description || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold">{money(row.balance ?? row.amount)}</td>
                </tr>)}
                {metrics.due.length === 0 ? <tr><td className="px-4 py-8 text-center text-app-muted" colSpan={5}>Nenhum vencimento em aberto no período.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </> : loading ? <div className="rounded-xl border border-app-border bg-app-surface px-4 py-12 text-center text-app-muted">Carregando dados financeiros…</div> : null}
    </div>
  </main>;
}

"use client";

import type {
  CurrentUserResponse,
  FinanceListResponse,
  FinanceRow,
  LogisticsExpenseAdminBreakdownItem,
  LogisticsExpenseAdminDashboardResponse,
  LogisticsExpenseAdminStatus,
} from '@helpdesk/contracts';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { NavigationIcon } from '../../../shared/navigation/navigation-icon';
import { getExpenseAdminDashboard } from '../api/expense-admin-dashboard-api';
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
  statements: FinanceListResponse;
};

type ChartPoint = {
  key: string;
  label: string;
  inflow: number;
  outflow: number;
  receivable: number;
  payable: number;
};

type RankedParty = {
  name: string;
  value: number;
};

type BreakdownValue = {
  name: string;
  value: number;
  count: number;
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

function compactMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function dateMs(value: string): number {
  return new Date(value.slice(0, 10) + 'T12:00:00').getTime();
}

function bucketFor(
  value: string,
  startDate: string,
  endDate: string,
): { key: string; label: string } {
  const start = dateMs(startDate);
  const end = dateMs(endDate);
  const current = dateMs(value);
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);

  if (days <= 45) {
    return {
      key: value.slice(0, 10),
      label: dateLabel(value).slice(0, 5),
    };
  }

  if (days <= 180) {
    const week = Math.max(0, Math.floor((current - start) / (86400000 * 7)));
    const bucketDate = new Date(start + week * 7 * 86400000);
    const key = bucketDate.toISOString().slice(0, 10);
    return {
      key,
      label: dateLabel(key).slice(0, 5),
    };
  }

  const key = value.slice(0, 7);
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: '2-digit',
  })
    .format(new Date(year, month - 1, 1))
    .replace('.', '');

  return { key, label };
}

function chartSeries(data: DashboardData): ChartPoint[] {
  const startDate = data.accrual.period.startDate;
  const endDate = data.accrual.period.endDate;
  const buckets = new Map<string, ChartPoint>();

  function point(value: string): ChartPoint {
    const bucket = bucketFor(value, startDate, endDate);
    const existing = buckets.get(bucket.key);
    if (existing) return existing;
    const created: ChartPoint = {
      key: bucket.key,
      label: bucket.label,
      inflow: 0,
      outflow: 0,
      receivable: 0,
      payable: 0,
    };
    buckets.set(bucket.key, created);
    return created;
  }

  for (const row of data.statements.rows) {
    if (!row.date) continue;
    const target = point(row.date);
    if (row.amount >= 0) target.inflow += row.amount;
    else target.outflow += Math.abs(row.amount);
  }

  for (const row of data.accrual.rows) {
    if (!row.dueDate || (row.balance ?? 0) <= 0) continue;
    point(row.dueDate).receivable += row.balance ?? 0;
  }

  for (const row of data.payables.rows) {
    if (!row.dueDate || (row.balance ?? 0) <= 0) continue;
    point(row.dueDate).payable += row.balance ?? 0;
  }

  return [...buckets.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function topReceivableParties(rows: FinanceRow[]): RankedParty[] {
  const values = new Map<string, number>();

  for (const row of rows) {
    const balance = row.balance ?? 0;
    if (balance <= 0) continue;
    const name = row.party.trim() || 'Cliente não informado';
    values.set(name, (values.get(name) ?? 0) + balance);
  }

  return [...values.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
}


function aggregateRows(
  rows: FinanceRow[],
  label: (row: FinanceRow) => string,
  value: (row: FinanceRow) => number = (row) => Math.abs(row.amount),
): BreakdownValue[] {
  const grouped = new Map<string, { value: number; count: number }>();

  for (const row of rows) {
    const name = label(row).trim() || 'Não informado';
    const current = grouped.get(name) ?? { value: 0, count: 0 };
    current.value += Math.abs(value(row));
    current.count += 1;
    grouped.set(name, current);
  }

  return [...grouped.entries()]
    .map(([name, item]) => ({ name, value: item.value, count: item.count }))
    .sort((left, right) => right.value - left.value);
}

function metadataNumber(row: FinanceRow, key: string): number {
  const value = row.metadata?.[key];
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function receiptSectorBreakdown(rows: FinanceRow[]): BreakdownValue[] {
  const sectors = new Map<string, { value: number; count: number }>();

  function add(name: string, value: number) {
    if (value <= 0) return;
    const current = sectors.get(name) ?? { value: 0, count: 0 };
    current.value += value;
    current.count += 1;
    sectors.set(name, current);
  }

  for (const row of rows) {
    const ti = Math.max(0, metadataNumber(row, 'percentTi'));
    const devops = Math.max(0, metadataNumber(row, 'percentDevops'));
    const marketing = Math.max(0, metadataNumber(row, 'percentMarketing'));
    const totalPercent = Math.min(100, ti + devops + marketing);
    add('TI', row.amount * ti / 100);
    add('DevOps', row.amount * devops / 100);
    add('Marketing', row.amount * marketing / 100);
    add('Não classificado', row.amount * Math.max(0, 100 - totalPercent) / 100);
  }

  return [...sectors.entries()]
    .map(([name, item]) => ({ name, value: item.value, count: item.count }))
    .sort((left, right) => right.value - left.value);
}

function overdueClientBreakdown(rows: FinanceRow[]): BreakdownValue[] {
  const today = isoToday();
  return aggregateRows(
    rows.filter((row) => Boolean(row.dueDate) && String(row.dueDate) < today && (row.balance ?? 0) > 0),
    (row) => row.party || 'Cliente não informado',
    (row) => row.balance ?? 0,
  );
}

function FinancialBreakdownChart({
  title,
  subtitle,
  items,
  accent = 'brand',
}: {
  title: string;
  subtitle: string;
  items: BreakdownValue[];
  accent?: 'brand' | 'orange' | 'emerald' | 'rose';
}) {
  const visible = items.slice(0, 8);
  const maxValue = Math.max(1, ...visible.map((item) => item.value));
  const barClass =
    accent === 'orange'
      ? 'bg-orange-400'
      : accent === 'emerald'
        ? 'bg-emerald-500'
        : accent === 'rose'
          ? 'bg-rose-500'
          : 'bg-app-brand';

  return <article className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10">
    <div className="mb-4">
      <h3 className="m-0 text-sm font-extrabold text-app-text">{title}</h3>
      <p className="m-0 mt-1 text-[11px] text-app-muted">{subtitle}</p>
    </div>
    {visible.length ? <div className="grid gap-3">
      {visible.map((item) => {
        const width = Math.max(2, (item.value / maxValue) * 100);
        return <div className="grid gap-1.5" key={item.name}>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate font-semibold text-app-text-soft" title={item.name}>{item.name}</span>
            <span className="shrink-0 text-right">
              <strong>{money(item.value)}</strong>
              <small className="ml-1.5 text-app-subtle">{item.count}</small>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-app-surface-muted">
            <div className={'h-full rounded-full ' + barClass} style={{ width: width + '%' }} />
          </div>
        </div>;
      })}
    </div> : <div className="grid min-h-[170px] place-items-center text-sm text-app-muted">Nenhum dado no período.</div>}
  </article>;
}

function chartLabelIndexes(length: number): Set<number> {
  if (length <= 8) return new Set(Array.from({ length }, (_, index) => index));
  const step = Math.max(1, Math.ceil(length / 6));
  const indexes = new Set<number>();
  for (let index = 0; index < length; index += step) indexes.add(index);
  indexes.add(length - 1);
  return indexes;
}

function RealizedCashFlowChart({ points }: { points: ChartPoint[] }) {
  const values = points.filter((point) => point.inflow > 0 || point.outflow > 0);
  const width = 760;
  const height = 270;
  const left = 54;
  const right = 18;
  const top = 22;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(
    1,
    ...values.flatMap((point) => [point.inflow, point.outflow]),
  );
  const x = (index: number) =>
    left + (values.length <= 1 ? plotWidth / 2 : (index / (values.length - 1)) * plotWidth);
  const y = (value: number) => top + plotHeight - (value / maxValue) * plotHeight;
  const labels = chartLabelIndexes(values.length);
  const path = (field: 'inflow' | 'outflow') =>
    values
      .map((point, index) => {
        const command = index === 0 ? 'M' : 'L';
        return command + ' ' + x(index).toFixed(1) + ' ' + y(point[field]).toFixed(1);
      })
      .join(' ');

  if (values.length === 0) {
    return <div className="grid min-h-[260px] place-items-center text-sm text-app-muted">Sem movimentações realizadas no período.</div>;
  }

  return <div className="overflow-hidden">
    <div className="mb-3 flex flex-wrap items-center gap-4 text-xs font-bold">
      <span className="inline-flex items-center gap-2 text-app-text-soft"><i className="size-2.5 rounded-full bg-emerald-500" />Entradas</span>
      <span className="inline-flex items-center gap-2 text-app-text-soft"><i className="size-2.5 rounded-full bg-rose-500" />Saídas</span>
    </div>
    <svg aria-label="Fluxo financeiro realizado" className="h-auto w-full overflow-visible" role="img" viewBox={'0 0 ' + width + ' ' + height}>
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const value = maxValue * ratio;
        const py = y(value);
        return <g key={ratio}>
          <line className="stroke-app-border-soft" x1={left} x2={width - right} y1={py} y2={py} />
          <text className="fill-app-subtle text-[10px]" textAnchor="end" x={left - 8} y={py + 3}>{compactMoney(value)}</text>
        </g>;
      })}
      {values.map((point, index) => labels.has(index) ? (
        <text className="fill-app-subtle text-[10px]" key={point.key} textAnchor="middle" x={x(index)} y={height - 12}>{point.label}</text>
      ) : null)}
      <path d={path('inflow')} fill="none" stroke="#10b981" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      <path d={path('outflow')} fill="none" stroke="#f43f5e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      {values.map((point, index) => <g key={'cash-' + point.key}>
        <circle cx={x(index)} cy={y(point.inflow)} fill="#10b981" r="3"><title>{point.label + ' · Entradas: ' + money(point.inflow)}</title></circle>
        <circle cx={x(index)} cy={y(point.outflow)} fill="#f43f5e" r="3"><title>{point.label + ' · Saídas: ' + money(point.outflow)}</title></circle>
      </g>)}
    </svg>
  </div>;
}

function OpenPortfolioChart({ points }: { points: ChartPoint[] }) {
  const values = points.filter((point) => point.receivable > 0 || point.payable > 0);
  const width = 760;
  const height = 270;
  const left = 54;
  const right = 18;
  const top = 22;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(
    1,
    ...values.flatMap((point) => [point.receivable, point.payable]),
  );
  const groupWidth = values.length ? plotWidth / values.length : plotWidth;
  const barWidth = Math.min(22, Math.max(6, groupWidth * 0.3));
  const labels = chartLabelIndexes(values.length);
  const y = (value: number) => top + plotHeight - (value / maxValue) * plotHeight;

  if (values.length === 0) {
    return <div className="grid min-h-[260px] place-items-center text-sm text-app-muted">Nenhuma conta em aberto no período.</div>;
  }

  return <div className="overflow-hidden">
    <div className="mb-3 flex flex-wrap items-center gap-4 text-xs font-bold">
      <span className="inline-flex items-center gap-2 text-app-text-soft"><i className="size-2.5 rounded-sm bg-sky-500" />A receber</span>
      <span className="inline-flex items-center gap-2 text-app-text-soft"><i className="size-2.5 rounded-sm bg-amber-500" />A pagar</span>
    </div>
    <svg aria-label="Carteira em aberto por vencimento" className="h-auto w-full overflow-visible" role="img" viewBox={'0 0 ' + width + ' ' + height}>
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const value = maxValue * ratio;
        const py = y(value);
        return <g key={ratio}>
          <line className="stroke-app-border-soft" x1={left} x2={width - right} y1={py} y2={py} />
          <text className="fill-app-subtle text-[10px]" textAnchor="end" x={left - 8} y={py + 3}>{compactMoney(value)}</text>
        </g>;
      })}
      {values.map((point, index) => {
        const center = left + groupWidth * index + groupWidth / 2;
        const receiveY = y(point.receivable);
        const payY = y(point.payable);
        return <g key={'open-' + point.key}>
          <rect fill="#0ea5e9" height={top + plotHeight - receiveY} rx="3" width={barWidth} x={center - barWidth - 2} y={receiveY}>
            <title>{point.label + ' · A receber: ' + money(point.receivable)}</title>
          </rect>
          <rect fill="#f59e0b" height={top + plotHeight - payY} rx="3" width={barWidth} x={center + 2} y={payY}>
            <title>{point.label + ' · A pagar: ' + money(point.payable)}</title>
          </rect>
          {labels.has(index) ? <text className="fill-app-subtle text-[10px]" textAnchor="middle" x={center} y={height - 12}>{point.label}</text> : null}
        </g>;
      })}
    </svg>
  </div>;
}

function PortfolioBalanceChart({
  receivable,
  payable,
}: {
  receivable: number;
  payable: number;
}) {
  const total = receivable + payable;
  const receivePercent = total > 0 ? (receivable / total) * 100 : 50;
  const projected = receivable - payable;

  return <div className="grid h-full content-center gap-5">
    <div className="mx-auto grid size-[190px] place-items-center rounded-full p-[18px]" style={{
      background: total > 0
        ? 'conic-gradient(#0ea5e9 0 ' + receivePercent + '%, #f59e0b ' + receivePercent + '% 100%)'
        : 'var(--app-surface-muted)',
    }}>
      <div className="grid size-full place-items-center rounded-full bg-app-surface text-center shadow-inner">
        <span className="grid gap-1 px-3">
          <small className="text-[10px] font-extrabold uppercase tracking-wide text-app-muted">Saldo projetado</small>
          <strong className={projected >= 0 ? 'text-base text-emerald-700 dark:text-emerald-300' : 'text-base text-rose-700 dark:text-rose-300'}>{money(projected)}</strong>
        </span>
      </div>
    </div>
    <div className="grid gap-2 text-sm">
      <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-app-muted"><i className="size-2.5 rounded-sm bg-sky-500" />A receber</span><strong>{money(receivable)}</strong></div>
      <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-app-muted"><i className="size-2.5 rounded-sm bg-amber-500" />A pagar</span><strong>{money(payable)}</strong></div>
    </div>
  </div>;
}

function TopClientsChart({ rows }: { rows: FinanceRow[] }) {
  const parties = topReceivableParties(rows);
  const maxValue = Math.max(1, ...parties.map((party) => party.value));

  if (parties.length === 0) {
    return <div className="grid min-h-[240px] place-items-center text-sm text-app-muted">Nenhum saldo de cliente em aberto.</div>;
  }

  return <div className="grid gap-3">
    {parties.map((party, index) => {
      const width = Math.max(3, (party.value / maxValue) * 100);
      return <div className="grid gap-1.5" key={party.name}>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="min-w-0 truncate font-semibold text-app-text-soft"><b className="mr-1.5 text-app-subtle">{index + 1}.</b>{party.name}</span>
          <strong className="shrink-0">{money(party.value)}</strong>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-app-surface-muted">
          <div className="h-full rounded-full bg-app-brand" style={{ width: width + '%' }} />
        </div>
      </div>;
    })}
  </div>;
}


type RdTimelinePoint = {
  key: string;
  label: string;
  amount: number;
  count: number;
};

const RD_STATUS_LABELS: Record<LogisticsExpenseAdminStatus, string> = {
  1: 'Aguardando aprovação',
  2: 'Aguardando pagamento',
  4: 'Pagas',
};

function rdStatusAmount(
  data: LogisticsExpenseAdminDashboardResponse,
  status: LogisticsExpenseAdminStatus,
): number {
  if (status === 1) return data.totals.periodPending;
  if (status === 2) return data.totals.periodApproved;
  return data.totals.periodPaid;
}

function rdStatusCount(
  data: LogisticsExpenseAdminDashboardResponse,
  status: LogisticsExpenseAdminStatus,
): number {
  if (status === 1) return data.totals.periodPendingCount;
  if (status === 2) return data.totals.periodApprovedCount;
  return data.totals.periodPaidCount;
}

function rdTimelineSeries(
  data: LogisticsExpenseAdminDashboardResponse,
): RdTimelinePoint[] {
  const buckets = new Map<string, RdTimelinePoint>();

  for (const item of data.timeline) {
    const bucket = bucketFor(item.date, data.period.startDate, data.period.endDate);
    const current = buckets.get(bucket.key) ?? {
      key: bucket.key,
      label: bucket.label,
      amount: 0,
      count: 0,
    };
    current.amount += item.amount;
    current.count += item.count;
    buckets.set(bucket.key, current);
  }

  return [...buckets.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function RdBreakdownChart({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: LogisticsExpenseAdminBreakdownItem[];
}) {
  const visible = items.slice(0, 8);
  const maxValue = Math.max(1, ...visible.map((item) => item.amount));

  return <article className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10">
    <div className="mb-4">
      <h3 className="m-0 text-sm font-extrabold text-app-text">{title}</h3>
      <p className="m-0 mt-1 text-[11px] text-app-muted">{subtitle}</p>
    </div>
    {visible.length ? <div className="grid gap-3">
      {visible.map((item) => {
        const width = Math.max(2, (item.amount / maxValue) * 100);
        return <div className="grid gap-1.5" key={item.key || item.label}>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate font-semibold text-app-text-soft" title={item.label}>{item.label}</span>
            <span className="shrink-0 text-right">
              <strong>{money(item.amount)}</strong>
              <small className="ml-1.5 text-app-subtle">{item.count} RD</small>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-app-surface-muted">
            <div className="h-full rounded-full bg-orange-400" style={{ width: width + '%' }} />
          </div>
        </div>;
      })}
    </div> : <div className="grid min-h-[170px] place-items-center text-sm text-app-muted">Nenhuma RD neste agrupamento.</div>}
  </article>;
}

function RdTimelineChart({
  points,
  status,
}: {
  points: RdTimelinePoint[];
  status: LogisticsExpenseAdminStatus;
}) {
  const width = 920;
  const height = 245;
  const left = 58;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(1, ...points.map((point) => point.amount));
  const groupWidth = points.length ? plotWidth / points.length : plotWidth;
  const barWidth = Math.min(38, Math.max(4, groupWidth * 0.62));
  const labels = chartLabelIndexes(points.length);
  const y = (value: number) => top + plotHeight - (value / maxValue) * plotHeight;

  if (!points.length) {
    return <div className="grid min-h-[235px] place-items-center text-sm text-app-muted">Nenhuma RD para o status e período selecionados.</div>;
  }

  return <svg aria-label={'Evolução de RDs ' + RD_STATUS_LABELS[status]} className="h-auto w-full overflow-visible" role="img" viewBox={'0 0 ' + width + ' ' + height}>
    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const value = maxValue * ratio;
      const py = y(value);
      return <g key={ratio}>
        <line className="stroke-app-border-soft" x1={left} x2={width - right} y1={py} y2={py} />
        <text className="fill-app-subtle text-[10px]" textAnchor="end" x={left - 8} y={py + 3}>{compactMoney(value)}</text>
      </g>;
    })}
    {points.map((point, index) => {
      const center = left + groupWidth * index + groupWidth / 2;
      const py = y(point.amount);
      return <g key={point.key}>
        <rect fill="#fb923c" height={top + plotHeight - py} rx="4" width={barWidth} x={center - barWidth / 2} y={py}>
          <title>{point.label + ' · ' + money(point.amount) + ' · ' + point.count + ' RD(s)'}</title>
        </rect>
        {labels.has(index) ? <text className="fill-app-subtle text-[10px]" textAnchor="middle" x={center} y={height - 12}>{point.label}</text> : null}
      </g>;
    })}
  </svg>;
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
  const [period, setPeriod] = useState(() => ({
    startDate: firstDayOfMonth(),
    endDate: isoToday(),
  }));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rdStatus, setRdStatus] = useState<LogisticsExpenseAdminStatus>(4);
  const [rdData, setRdData] = useState<LogisticsExpenseAdminDashboardResponse | null>(null);
  const [rdLoading, setRdLoading] = useState(true);
  const [rdError, setRdError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const filters = period;
      const [accrual, cashflow, payables, statements] = await Promise.all([
        fetchFinanceView('receivables-accrual', filters, signal),
        fetchFinanceView('receivables-cashflow', filters, signal),
        fetchFinanceView('payables', filters, signal),
        fetchFinanceView('statements', filters, signal),
      ]);
      setData({ accrual, cashflow, payables, statements });
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setError(errorMessage(reason));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const loadRd = useCallback(async (signal?: AbortSignal) => {
    setRdLoading(true);
    setRdError('');
    try {
      const response = await getExpenseAdminDashboard(
        period.startDate,
        period.endDate,
        rdStatus,
        signal,
      );
      setRdData(response);
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setRdError(errorMessage(reason));
    } finally {
      if (!signal?.aborted) setRdLoading(false);
    }
  }, [period, rdStatus]);

  useEffect(() => {
    const controller = new AbortController();
    void loadRd(controller.signal);
    return () => controller.abort();
  }, [loadRd]);

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
      realizedInflow: data.statements.summary.inflow,
      realizedOutflow: data.statements.summary.outflow,
      realizedBalance: data.statements.summary.balance,
      charts: chartSeries(data),
      expensesByClassification: aggregateRows(data.payables.rows, (row) => row.classification ?? 'Sem classificação'),
      expensesByGroup: aggregateRows(data.payables.rows, (row) => row.group ?? 'Sem grupo'),
      expensesByDocument: aggregateRows(data.payables.rows, (row) => row.documentType ?? 'Sem documento'),
      expensesByCompany: aggregateRows(data.payables.rows, (row) => row.party || 'Fornecedor não informado'),
      receiptSectors: receiptSectorBreakdown(data.cashflow.rows),
      overdueClients: overdueClientBreakdown(data.accrual.rows),
      due: dueRows(data),
    };
  }, [data]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (startDate > endDate) {
      setError('Data inicial não pode ser maior que a data final.');
      return;
    }
    if (period.startDate === startDate && period.endDate === endDate) {
      void load();
      void loadRd();
      return;
    }
    setPeriod({ startDate, endDate });
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


        <section className="grid grid-cols-[minmax(0,1.65fr)_minmax(280px,0.7fr)] gap-3 max-[1050px]:grid-cols-1">
          <article className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-base font-extrabold">Fluxo realizado</h2>
                <p className="m-0 mt-1 text-xs text-app-muted">Entradas e saídas efetivamente movimentadas no período selecionado.</p>
              </div>
              <span className={metrics.realizedBalance >= 0 ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'rounded-full bg-rose-50 px-2.5 py-1 text-xs font-extrabold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}>
                {'Saldo ' + money(metrics.realizedBalance)}
              </span>
            </div>
            <RealizedCashFlowChart points={metrics.charts} />
          </article>

          <article className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10">
            <div className="mb-4">
              <h2 className="m-0 text-base font-extrabold">Posição em aberto</h2>
              <p className="m-0 mt-1 text-xs text-app-muted">Peso da carteira a receber e dos compromissos a pagar.</p>
            </div>
            <PortfolioBalanceChart payable={metrics.openPayables} receivable={metrics.openReceivables} />
          </article>
        </section>

        <section className="grid grid-cols-[minmax(0,1.5fr)_minmax(300px,0.75fr)] gap-3 max-[1050px]:grid-cols-1">
          <article className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10">
            <div className="mb-4">
              <h2 className="m-0 text-base font-extrabold">Carteira por vencimento</h2>
              <p className="m-0 mt-1 text-xs text-app-muted">Comparativo dos saldos em aberto de contas a receber e contas a pagar.</p>
            </div>
            <OpenPortfolioChart points={metrics.charts} />
          </article>

          <article className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10">
            <div className="mb-4">
              <h2 className="m-0 text-base font-extrabold">Maiores saldos a receber</h2>
              <p className="m-0 mt-1 text-xs text-app-muted">Clientes com maior valor ainda em aberto no período.</p>
            </div>
            <TopClientsChart rows={data.accrual.rows} />
          </article>
        </section>



        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-app-subtle">Composição financeira</span>
              <h2 className="m-0 mt-1 text-lg font-extrabold">Leituras inspiradas no BI</h2>
              <p className="m-0 mt-1 text-sm text-app-muted">Classificação das despesas, fornecedores, setores de recebimento e inadimplência no período.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1">
            <FinancialBreakdownChart accent="orange" items={metrics.expensesByClassification} subtitle="Contas a pagar agrupadas pela classificação cadastrada." title="Despesas por Classificação" />
            <FinancialBreakdownChart accent="orange" items={metrics.expensesByGroup} subtitle="Distribuição das contas a pagar por grupo financeiro." title="Despesas por Grupo" />
            <FinancialBreakdownChart accent="orange" items={metrics.expensesByDocument} subtitle="Composição pelo tipo de documento informado." title="Despesas por Tipo de Documento" />
            <FinancialBreakdownChart accent="orange" items={metrics.expensesByCompany} subtitle="Fornecedores com maior volume de despesas no período." title="Despesas por Empresa / Fornecedor" />
            <FinancialBreakdownChart accent="emerald" items={metrics.receiptSectors} subtitle="Recebimentos distribuídos pelos percentuais TI, DevOps e Marketing." title="Recebimento por Setor" />
            <FinancialBreakdownChart accent="rose" items={metrics.overdueClients} subtitle="Saldos vencidos e ainda em aberto, agrupados por cliente." title="Inadimplência por Cliente" />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm shadow-slate-950/5 dark:shadow-black/10">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-app-border bg-slate-800 px-5 py-4 text-white dark:bg-slate-900">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">Relatório de Despesas</span>
              <h2 className="m-0 mt-1 text-lg font-extrabold">RD · Visão analítica</h2>
              <p className="m-0 mt-1 text-xs text-slate-300">Grupo, subgrupo, técnico e empresa com o mesmo período do dashboard financeiro.</p>
            </div>
            <Link className="inline-flex min-h-9 items-center rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-bold text-white no-underline transition hover:bg-white/20" href="/logistica/despesas/administracao">Abrir gestão completa de RDs</Link>
          </header>

          {rdError ? <div className="m-4 rounded-lg border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger">{rdError}</div> : null}

          {rdData ? <div className="grid gap-4 p-4">
            <div className="grid grid-cols-3 gap-3 max-[800px]:grid-cols-1">
              {([1, 2, 4] as const).map((status) => {
                const active = rdStatus === status;
                const value = rdStatusAmount(rdData, status);
                const count = rdStatusCount(rdData, status);
                return <button
                  aria-pressed={active}
                  className="grid min-h-[105px] cursor-pointer gap-1 rounded-xl border border-app-border bg-app-surface p-4 text-left transition hover:border-orange-300 hover:bg-orange-50/50 aria-pressed:border-orange-400 aria-pressed:bg-orange-50 dark:hover:bg-orange-950/20 dark:aria-pressed:bg-orange-950/30"
                  key={status}
                  onClick={() => setRdStatus(status)}
                  type="button"
                >
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.04em] text-app-muted">{RD_STATUS_LABELS[status]}</span>
                  <strong className="text-xl text-app-text">{money(value)}</strong>
                  <small className="text-xs text-app-subtle">{count} lançamento(s) no período</small>
                </button>;
              })}
            </div>

            <article className="rounded-xl border border-app-border bg-app-surface p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="m-0 text-sm font-extrabold">Evolução das RDs · {RD_STATUS_LABELS[rdStatus]}</h3>
                  <p className="m-0 mt-1 text-[11px] text-app-muted">Valor das despesas ao longo do período selecionado.</p>
                </div>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-extrabold text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
                  {money(rdStatusAmount(rdData, rdStatus))}
                </span>
              </div>
              <RdTimelineChart points={rdTimelineSeries(rdData)} status={rdStatus} />
            </article>

            <div className="grid grid-cols-4 gap-3 max-[1250px]:grid-cols-2 max-[720px]:grid-cols-1">
              <RdBreakdownChart items={rdData.groups} subtitle="Centro macro da despesa." title="Por Grupo" />
              <RdBreakdownChart items={rdData.subgroups} subtitle="Natureza detalhada da RD." title="Por Subgrupo" />
              <RdBreakdownChart items={rdData.collaborators} subtitle="Colaborador responsável pelo lançamento." title="Por Técnico" />
              <RdBreakdownChart items={rdData.clients} subtitle="Empresa ou cliente relacionado à despesa." title="Por Empresa" />
            </div>
          </div> : rdLoading ? <div className="grid min-h-[220px] place-items-center p-5 text-sm text-app-muted">Carregando análise de RDs…</div> : null}
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

"use client";

import { useMemo } from 'react';
import {
  ReportStackedBarChart,
  type ReportStackedBarRow,
} from './report-stacked-bar-chart';

export type ReportChartType = 'bar' | 'pie' | 'donut';

const COLORS = [
  '#2563eb',
  '#f59e0b',
  '#dc2626',
  '#16a34a',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
  '#ea580c',
  '#475569',
  '#0f766e',
  '#9333ea',
];

function pieRows(rows: ReportStackedBarRow[]) {
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  if (sorted.length <= 10) return sorted;

  const visible = sorted.slice(0, 9);
  const others = sorted.slice(9);
  visible.push({
    key: '__others__',
    label: 'Outros',
    level1: others.reduce((sum, row) => sum + row.level1, 0),
    level2: others.reduce((sum, row) => sum + row.level2, 0),
    level3: others.reduce((sum, row) => sum + row.level3, 0),
    total: others.reduce((sum, row) => sum + row.total, 0),
  });
  return visible;
}

export function ReportChartView({
  rows,
  type,
  emptyMessage,
}: {
  rows: ReportStackedBarRow[];
  type: ReportChartType;
  emptyMessage?: string;
}) {
  const slices = useMemo(() => pieRows(rows), [rows]);
  const total = slices.reduce((sum, row) => sum + row.total, 0);

  if (type === 'bar') {
    return <ReportStackedBarChart emptyMessage={emptyMessage} rows={rows} />;
  }

  if (!rows.length || total <= 0) {
    return (
      <div className="grid min-h-[320px] place-items-center rounded-xl border border-dashed border-app-border bg-app-surface-muted/40 px-6 text-center text-sm text-app-muted">
        {emptyMessage ?? 'Nenhum registro para os filtros selecionados.'}
      </div>
    );
  }

  let cursor = 0;
  const gradient = slices
    .map((row, index) => {
      const start = cursor;
      cursor += (row.total / total) * 100;
      return `${COLORS[index % COLORS.length]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    })
    .join(', ');

  return (
    <div className="grid min-h-[360px] grid-cols-[minmax(260px,420px)_1fr] items-center gap-8 px-4 py-5 max-[820px]:grid-cols-1">
      <div className="grid place-items-center">
        <div
          aria-label={`Distribuição de ${total} registros`}
          className="relative aspect-square w-full max-w-[330px] rounded-full"
          style={{ background: `conic-gradient(${gradient})` }}
        >
          {type === 'donut' ? (
            <div className="absolute inset-[24%] grid place-items-center rounded-full bg-app-surface text-center shadow-inner">
              <div>
                <strong className="block text-3xl">{total.toLocaleString('pt-BR')}</strong>
                <span className="text-xs font-semibold text-app-muted">registros</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {slices.map((row, index) => {
          const percentage = total ? (row.total / total) * 100 : 0;
          return (
            <div
              className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-app-surface-hover"
              key={row.key}
            >
              <span
                className="size-3 rounded-sm"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="truncate text-sm font-semibold" title={row.label}>
                {row.label}
              </span>
              <span className="whitespace-nowrap text-xs text-app-muted">
                {row.total.toLocaleString('pt-BR')} · {percentage.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReportChartTypePicker({
  value,
  onChange,
  allowPie = true,
}: {
  value: ReportChartType;
  onChange: (value: ReportChartType) => void;
  allowPie?: boolean;
}) {
  const options: Array<{ value: ReportChartType; label: string }> = allowPie
    ? [
        { value: 'bar', label: 'Barras' },
        { value: 'pie', label: 'Pizza' },
        { value: 'donut', label: 'Rosca' },
      ]
    : [{ value: 'bar', label: 'Barras' }];

  return (
    <div className="inline-flex rounded-lg border border-app-border bg-app-surface-muted p-1">
      {options.map((option) => (
        <button
          className={`min-h-8 rounded-md px-3 text-xs font-bold transition ${
            value === option.value
              ? 'bg-app-surface text-app-brand shadow-sm'
              : 'text-app-muted hover:text-app-text'
          }`}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useMemo } from 'react';
import { ReportChartDetails, useChartInteraction } from './report-chart-interaction';
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
    other: others.reduce((sum, row) => sum + (row.other ?? 0), 0),
  });
  return visible;
}

// Two arcs per slice also handle a single item covering the complete circle.
function slicePath(start: number, end: number, inner: number): string {
  const point = (radius: number, angle: number) => [Math.cos(angle - Math.PI / 2) * radius, Math.sin(angle - Math.PI / 2) * radius].join(' ');
  const middle = (start + end) / 2;
  const outer = `M ${point(100, start)} A 100 100 0 0 1 ${point(100, middle)} A 100 100 0 0 1 ${point(100, end)}`;
  return inner ? `${outer} L ${point(inner, end)} A ${inner} ${inner} 0 0 0 ${point(inner, middle)} A ${inner} ${inner} 0 0 0 ${point(inner, start)} Z` : `${outer} L 0 0 Z`;
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
  const slices = useMemo(() => pieRows(rows).filter(row => row.total > 0), [rows]);
  const interaction = useChartInteraction(slices);
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
  const segments = slices.map((row, index) => {
    const start = cursor;
    cursor += row.total / total * Math.PI * 2;
    return { row, color: COLORS[index % COLORS.length], start, end: cursor };
  });

  return <div data-report-chart={type}>
    <div className="grid min-h-[360px] grid-cols-[minmax(220px,420px)_minmax(0,1fr)] items-center gap-8 px-4 py-5 max-[820px]:grid-cols-1">
      <div className="grid place-items-center">
        <svg viewBox="-115 -115 230 230" className="aspect-square w-full max-w-[350px] overflow-visible" role="group" aria-label={`Distribuição de ${total} registros`}>
          {segments.map(({ row, color, start, end }) => {
            const active = interaction.active?.key === row.key;
            const middle = (start + end) / 2 - Math.PI / 2;
            return <path key={row.key} d={slicePath(start, end, type === 'donut' ? 52 : 0)} fill={color}
              role="button" tabIndex={0} aria-pressed={interaction.selected === row.key}
              aria-label={`${row.label}: ${row.total} atendimento(s), ${(row.total / total * 100).toFixed(1)}%`}
              {...interaction.events(row)}
              onKeyDown={event => {
                interaction.events(row).onKeyDown(event);
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); interaction.events(row).onClick(); }
              }}
              className="cursor-pointer transition-[opacity,transform] duration-200 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-app-text print:opacity-100! print:[transform:none]!"
              style={{ opacity: interaction.active && !active ? 0.35 : 1, transform: active ? `translate(${Math.cos(middle) * 5}px, ${Math.sin(middle) * 5}px)` : undefined }}>
              <title>{row.label}: {row.total.toLocaleString('pt-BR')} ({(row.total / total * 100).toFixed(1)}%)</title>
            </path>;
          })}
          {type === 'donut' ? <g className="pointer-events-none fill-app-text text-center" aria-hidden="true"><text textAnchor="middle" y="-2" fontSize="17" fontWeight="700">{total.toLocaleString('pt-BR')}</text><text textAnchor="middle" y="16" fontSize="9">registros</text></g> : null}
        </svg>
      </div>
      <div className="min-w-0 space-y-2" aria-label="Legenda interativa">
        {segments.map(({ row, color }) => <button type="button" key={row.key}
          aria-pressed={interaction.selected === row.key} {...interaction.events(row)}
          className={`grid w-full grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-2 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-app-brand print:border-transparent print:bg-transparent ${interaction.active?.key === row.key ? 'border-app-brand bg-app-brand-soft' : 'border-transparent hover:bg-app-surface-hover'}`}>
          <span className="size-3 rounded-sm" style={{ backgroundColor: color }} />
          <span className="truncate text-sm font-semibold" title={row.label}>{row.label}</span>
          <span className="whitespace-nowrap text-xs text-app-muted">{row.total.toLocaleString('pt-BR')} · {(row.total / total * 100).toFixed(1)}%</span>
        </button>)}
      </div>
    </div>
    <ReportChartDetails row={interaction.active} total={total} selected={slices.some(row => row.key === interaction.selected)} onClear={interaction.clear} />
  </div>;

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
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

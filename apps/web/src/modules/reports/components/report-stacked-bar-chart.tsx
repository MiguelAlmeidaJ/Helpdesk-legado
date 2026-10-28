"use client";

import { ReportChartDetails, useChartInteraction } from './report-chart-interaction';

export type ReportStackedBarRow = {
  key: string;
  label: string;
  level1: number;
  level2: number;
  level3: number;
  total: number;
  other?: number;
};

function axisMax(value: number): number {
  if (value <= 5) return 5;
  if (value <= 10) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return Math.ceil(value / (step * magnitude)) * step * magnitude;
}

export function ReportStackedBarChart({
  rows,
  emptyMessage = 'Nenhum registro para os filtros selecionados.',
}: {
  rows: ReportStackedBarRow[];
  emptyMessage?: string;
}) {
  const interaction = useChartInteraction(rows);
  if (!rows.length) {
    return (
      <div className="grid min-h-[320px] place-items-center rounded-xl border border-dashed border-app-border bg-app-surface-muted/40 px-6 text-center text-sm text-app-muted">
        {emptyMessage}
      </div>
    );
  }

  const max = axisMax(Math.max(...rows.map((row) => row.total), 1));
  const ticks = [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0];
  const minWidth = Math.max(760, rows.length * 78);

  return (
    <div data-report-chart="bar">
    <div className="overflow-x-auto">
      <div className="relative h-[390px]" style={{ minWidth }}>
        <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-6 text-sm text-app-muted">
          <span className="inline-flex items-center gap-2"><i className="size-3 rounded-sm bg-blue-600" />Nível 1</span>
          <span className="inline-flex items-center gap-2"><i className="size-3 rounded-sm bg-amber-500" />Nível 2</span>
          <span className="inline-flex items-center gap-2"><i className="size-3 rounded-sm bg-red-600" />Nível 3</span>
          {rows.some(row => row.other) ? <span className="inline-flex items-center gap-2"><i className="size-3 rounded-sm bg-slate-500" />Outros níveis</span> : null}
        </div>

        <div className="absolute inset-x-0 bottom-[78px] top-10">
          {ticks.map((tick, index) => (
            <div
              className="absolute inset-x-0 flex items-center"
              key={tick + '-' + index}
              style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
            >
              <span className="w-10 shrink-0 pr-2 text-right text-[10px] text-app-subtle">
                {tick}
              </span>
              <span className="h-px flex-1 bg-app-border-soft" />
            </div>
          ))}

          <div className="absolute bottom-0 left-11 right-0 top-0 flex items-end justify-around gap-3 px-3">
            {rows.map((row) => {
              const height = Math.max(1.5, (row.total / max) * 100);
              const level1 = row.total ? (row.level1 / row.total) * 100 : 0;
              const level2 = row.total ? (row.level2 / row.total) * 100 : 0;
              const level3 = row.total ? (row.level3 / row.total) * 100 : 0;

              return (
                <div className="relative flex h-full min-w-[48px] flex-1 items-end justify-center" key={row.key}>
                  <button
                    type="button"
                    aria-pressed={interaction.selected === row.key}
                    {...interaction.events(row)}
                    aria-label={`${row.label}: ${row.total} atendimento(s)`}
                    className="relative flex w-[min(54px,72%)] min-w-8 cursor-pointer flex-col-reverse overflow-visible rounded-t-md border-0 p-0 shadow-sm transition-opacity motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-app-brand print:opacity-100!"
                    style={{ height: `${height}%`, opacity: interaction.active && interaction.active.key !== row.key ? 0.35 : 1 }}
                    title={`${row.label} · N1 ${row.level1} · N2 ${row.level2} · N3 ${row.level3}`}
                  >
                    {row.level1 > 0 ? (
                      <span className="relative block bg-blue-600" style={{ height: `${level1}%` }}>
                        {level1 >= 16 ? <b className="absolute inset-0 grid place-items-center text-[10px] text-white">{row.level1}</b> : null}
                      </span>
                    ) : null}
                    {row.level2 > 0 ? (
                      <span className="relative block bg-amber-500" style={{ height: `${level2}%` }}>
                        {level2 >= 16 ? <b className="absolute inset-0 grid place-items-center text-[10px] text-white">{row.level2}</b> : null}
                      </span>
                    ) : null}
                    {row.level3 > 0 ? (
                      <span className="relative block bg-red-600" style={{ height: `${level3}%` }}>
                        {level3 >= 16 ? <b className="absolute inset-0 grid place-items-center text-[10px] text-white">{row.level3}</b> : null}
                      </span>
                    ) : null}
                    {row.other ? <span className="relative block bg-slate-500" style={{ height: `${row.other / row.total * 100}%` }} /> : null}
                    <strong className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] text-app-text-soft">
                      {row.total}
                    </strong>
                  </button>
                  <span className="absolute -bottom-[58px] left-1/2 w-[92px] -translate-x-1/2 -rotate-[32deg] truncate text-left text-[10px] text-app-muted" title={row.label}>
                    {row.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    <ReportChartDetails row={interaction.active} total={rows.reduce((sum, row) => sum + row.total, 0)} selected={rows.some(row => row.key === interaction.selected)} onClear={interaction.clear} />
    </div>
  );
}

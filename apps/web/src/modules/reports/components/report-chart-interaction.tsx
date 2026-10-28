'use client';

import { useState } from 'react';
import type { ReportStackedBarRow } from './report-stacked-bar-chart';

export function useChartInteraction(rows: ReportStackedBarRow[]) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const active = rows.find(row => row.key === (hovered ?? selected));
  const clear = () => { setHovered(null); setSelected(null); };
  return {
    active, selected, clear,
    events: (row: ReportStackedBarRow) => ({
      onMouseEnter: () => setHovered(row.key),
      onMouseLeave: () => setHovered(null),
      onFocus: () => setHovered(row.key),
      onBlur: () => setHovered(null),
      onClick: () => setSelected(current => current === row.key ? null : row.key),
      onKeyDown: (event: React.KeyboardEvent<HTMLElement | SVGElement>) => {
        if (event.key === 'Escape') { clear(); event.currentTarget.blur(); }
      },
    }),
  };
}

export function ReportChartDetails({ row, total, selected, onClear }: {
  row?: ReportStackedBarRow; total: number; selected: boolean; onClear: () => void;
}) {
  return <div className="mt-3 flex min-h-20 flex-wrap items-center justify-between gap-3 rounded-xl border border-app-border bg-app-surface-muted px-4 py-3 print:hidden" data-chart-details>
    <div aria-live="polite" aria-atomic="true" className="min-w-0 text-sm">
      {row ? <><strong className="break-words">{row.label}</strong><p className="mb-0 mt-1 text-xs text-app-muted">{row.total.toLocaleString('pt-BR')} atendimento(s) · {(total ? row.total / total * 100 : 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do total · Nível 1: {row.level1} · Nível 2: {row.level2} · Nível 3: {row.level3}</p></>
        : <span className="text-app-muted">Passe o mouse ou use Tab para explorar. Clique ou toque para fixar um item.</span>}
    </div>
    {selected ? <button type="button" className="shrink-0 rounded-lg border border-app-border px-3 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-app-brand" onClick={onClear}>Limpar destaque</button> : null}
  </div>;
}

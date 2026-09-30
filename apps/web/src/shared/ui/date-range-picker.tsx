"use client";

import { useMemo, useState } from 'react';

type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  disabled?: boolean;
};

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parse(value: string): Date {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00Z`)
    : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function pt(value: string): string {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  disabled = false,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [awaitingEnd, setAwaitingEnd] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const base = parse(startDate);
    return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  });

  const days = useMemo(() => {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const first = new Date(Date.UTC(year, month, 1));
    const start = new Date(first);
    start.setUTCDate(first.getUTCDate() - first.getUTCDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      return date;
    });
  }, [cursor]);

  function choose(date: Date) {
    const value = iso(date);
    if (!awaitingEnd) {
      onChange({ startDate: value, endDate: value });
      setAwaitingEnd(true);
      return;
    }

    const first = startDate || value;
    const next =
      value < first
        ? { startDate: value, endDate: first }
        : { startDate: first, endDate: value };
    onChange(next);
    setAwaitingEnd(false);
    setOpen(false);
  }

  function move(months: number) {
    setCursor(
      new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + months, 1)),
    );
  }

  return (
    <div className="relative">
      <button
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-app-border-strong bg-app-surface px-3 text-left text-sm text-app-text outline-none transition hover:bg-app-surface-hover focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onClick={() => {
          setOpen((value) => !value);
          setAwaitingEnd(false);
        }}
        type="button"
      >
        <span>{pt(startDate)} — {pt(endDate)}</span>
        <span aria-hidden="true" className="text-base">▣</span>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[320px] rounded-2xl border border-app-border bg-app-surface p-3 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <button className="grid size-9 place-items-center rounded-lg border border-app-border bg-app-surface hover:bg-app-surface-hover" onClick={() => move(-1)} type="button">‹</button>
            <strong className="text-sm capitalize">
              {cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
            </strong>
            <button className="grid size-9 place-items-center rounded-lg border border-app-border bg-app-surface hover:bg-app-surface-hover" onClick={() => move(1)} type="button">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day, index) => (
              <span className="py-1 text-[10px] font-extrabold text-app-muted" key={`${day}-${index}`}>{day}</span>
            ))}
            {days.map((date) => {
              const value = iso(date);
              const inMonth = date.getUTCMonth() === cursor.getUTCMonth();
              const selected = value === startDate || value === endDate;
              const inRange = Boolean(startDate && endDate && value > startDate && value < endDate);
              return (
                <button
                  className={[
                    'grid aspect-square place-items-center rounded-lg text-xs font-bold transition',
                    inMonth ? 'text-app-text' : 'text-app-subtle opacity-45',
                    inRange ? 'bg-app-brand-soft text-app-brand' : '',
                    selected ? 'bg-app-brand text-white' : 'hover:bg-app-surface-hover',
                  ].join(' ')}
                  key={value}
                  onClick={() => choose(date)}
                  type="button"
                >
                  {date.getUTCDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-app-border-soft pt-3 text-xs text-app-muted">
            <span>{awaitingEnd ? 'Selecione a data final' : 'Selecione a data inicial'}</span>
            <button className="font-bold text-app-brand" onClick={() => setOpen(false)} type="button">Fechar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

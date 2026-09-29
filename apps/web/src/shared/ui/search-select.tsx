"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchSelectOption {
  value: string;
  label: string;
}

export function SearchSelect({
  id,
  options,
  value,
  onChange,
  multiple = false,
  placeholder = 'Todos',
  searchPlaceholder = 'Pesquisar...',
  multipleLabel = 'selecionados',
  disabled = false,
  searchable = true,
  allowClear = true,
  compact = false,
}: {
  id?: string;
  options: SearchSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  multipleLabel?: string;
  disabled?: boolean;
  searchable?: boolean;
  allowClear?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);

  const selected = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    if (!query) return options;

    return options.filter((option) =>
      option.label.toLocaleLowerCase('pt-BR').includes(query),
    );
  }, [options, search]);

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0]?.label ?? placeholder
        : `${selected.length} ${multipleLabel}`;

  function choose(option: SearchSelectOption) {
    if (!multiple) {
      onChange([option.value]);
      setOpen(false);
      setSearch('');
      return;
    }

    onChange(
      value.includes(option.value)
        ? value.filter((entry) => entry !== option.value)
        : [...value, option.value],
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        id={id}
        className={`group flex w-full items-center justify-between gap-2 rounded-lg border border-app-border-strong bg-app-surface text-left text-sm text-app-text outline-none transition hover:border-app-brand hover:bg-app-surface-hover focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55 ${compact ? 'min-h-9 px-3' : 'min-h-10 px-3'}`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={`min-w-0 truncate ${selected.length ? 'text-app-text' : 'text-app-muted'}`}>
          {summary}
        </span>
        <svg aria-hidden="true" className={`size-4 shrink-0 text-app-muted transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24">
          <path d="m7 9 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-[0_16px_40px_rgba(15,23,42,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.36)]">
          {searchable ? (
            <div className="border-b border-app-border-soft bg-app-surface-muted p-2">
              <div className="relative">
                <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-app-subtle" fill="none" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="m16.5 16.5 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                </svg>
                <input
                  autoFocus
                  className="min-h-9 w-full rounded-lg border border-app-border-strong bg-app-surface py-1 pl-9 pr-3 text-sm text-app-text outline-none focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)]"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={searchPlaceholder}
                  type="search"
                  value={search}
                />
              </div>
            </div>
          ) : null}

          <div className="max-h-[280px] overflow-y-auto p-1.5">
            {allowClear ? (
              <button
                className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-semibold text-app-text-soft transition hover:bg-app-surface-hover"
                onClick={() => {
                  onChange([]);
                  if (!multiple) setOpen(false);
                }}
                type="button"
              >
                <span className="grid size-4 place-items-center rounded border border-app-border-strong bg-app-surface">
                  {value.length === 0 ? <span className="size-2 rounded-sm bg-app-brand" /> : null}
                </span>
                {placeholder}
              </button>
            ) : null}

            {filtered.map((option) => {
              const checked = value.includes(option.value);
              return (
                <button
                  className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm text-app-text transition hover:bg-app-surface-hover"
                  key={option.value}
                  onClick={() => choose(option)}
                  type="button"
                >
                  <span className={`grid size-4 shrink-0 place-items-center rounded border ${checked ? 'border-app-brand bg-app-brand text-app-brand-contrast' : 'border-app-border-strong bg-app-surface'}`}>
                    {checked ? (
                      <svg aria-hidden="true" className="size-3" fill="none" viewBox="0 0 24 24">
                        <path d="m6 12 4 4 8-8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
                      </svg>
                    ) : null}
                  </span>
                  <span className="min-w-0 truncate">{option.label}</span>
                </button>
              );
            })}

            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-app-muted">
                Nenhum resultado encontrado.
              </div>
            ) : null}
          </div>

          {multiple ? (
            <div className="flex items-center justify-between gap-2 border-t border-app-border-soft bg-app-surface-muted px-2.5 py-2">
              <span className="text-xs text-app-muted">
                {value.length} selecionado(s)
              </span>
              <button
                className="app-button app-button--secondary app-button--sm"
                onClick={() => setOpen(false)}
                type="button"
              >
                Concluir
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

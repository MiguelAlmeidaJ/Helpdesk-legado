"use client";

import { useEffect, useState } from 'react';

type ThemePreference = 'light' | 'system' | 'dark';

const THEME_STORAGE_KEY = 'helpdesk-theme';
const OPTIONS: Array<{ value: ThemePreference; label: string; symbol: string }> = [
  { value: 'light', label: 'Claro', symbol: '☀' },
  { value: 'system', label: 'Sistema', symbol: '◐' },
  { value: 'dark', label: 'Escuro', symbol: '☾' },
];

function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === 'light' || value === 'system' || value === 'dark';
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(preference: ThemePreference): void {
  const dark = preference === 'dark' || (preference === 'system' && prefersDark());
  const root = document.documentElement;

  root.classList.toggle('dark', dark);
  root.dataset.theme = preference;
  root.style.colorScheme = dark ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let initial: ThemePreference = 'system';
    const documentPreference = document.documentElement.dataset.theme;

    if (isThemePreference(documentPreference)) {
      initial = documentPreference;
    } else {
      try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (isThemePreference(stored)) initial = stored;
      } catch {
        // localStorage can be unavailable in restricted browser contexts.
      }
    }

    setPreference(initial);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    applyTheme(preference);
    if (preference !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, [preference, ready]);

  function choose(next: ThemePreference) {
    setPreference(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Keep the theme active for the current page even without persistence.
    }
  }

  return (
    <section className="mt-3 border-t border-app-border-soft pt-3" aria-label="Tema da interface">
      <span className="text-[10px] font-black uppercase tracking-[0.1em] text-app-muted">
        Aparência
      </span>
      <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-app-surface-muted p-1">
        {OPTIONS.map((option) => {
          const active = preference === option.value;
          return (
            <button
              aria-pressed={active}
              className={[
                'flex min-h-9 items-center justify-center gap-1 rounded-md border px-2 text-[11px] font-extrabold transition-colors',
                active
                  ? 'border-app-brand bg-app-brand-soft text-app-brand'
                  : 'border-transparent bg-transparent text-app-muted hover:bg-app-surface-hover hover:text-app-text',
              ].join(' ')}
              key={option.value}
              onClick={() => choose(option.value)}
              type="button"
            >
              <span aria-hidden="true">{option.symbol}</span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

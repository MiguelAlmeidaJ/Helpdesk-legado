"use client";

import type {
  AppNotificationItem,
  NotificationCenterResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchNotifications,
  markNotificationsRead,
} from '../api/notifications-api';

const SEVERITY = {
  critical: {
    dot: 'bg-rose-500',
    border: 'border-rose-200 dark:border-rose-900/60',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    label: 'Crítico',
  },
  warning: {
    dot: 'bg-amber-500',
    border: 'border-amber-200 dark:border-amber-900/60',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    label: 'Atenção',
  },
  info: {
    dot: 'bg-sky-500',
    border: 'border-app-border',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    label: 'Informação',
  },
} as const;

function timeLabel(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function NotificationCenterButton() {
  const [data, setData] = useState<NotificationCenterResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetchNotifications(signal);
      setData(response);
    } catch {
      // O header não deve quebrar a navegação se a central estiver indisponível.
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = window.setInterval(() => void load(), 60_000);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);

  const unreadKeys = useMemo(
    () => data?.items.filter((item) => !item.read).map((item) => item.key) ?? [],
    [data],
  );

  async function mark(keys: string[]) {
    if (!keys.length) return;
    setData((current) =>
      current
        ? {
            ...current,
            unreadCount: Math.max(
              0,
              current.unreadCount -
                current.items.filter(
                  (item) => keys.includes(item.key) && !item.read,
                ).length,
            ),
            items: current.items.map((item) =>
              keys.includes(item.key) ? { ...item, read: true } : item,
            ),
          }
        : current,
    );

    try {
      await markNotificationsRead({ keys });
    } catch {
      void load();
    }
  }

  function itemContent(item: AppNotificationItem) {
    const tone = SEVERITY[item.severity];

    return (
      <>
        <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${tone.dot}`} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <strong className="text-xs text-app-text">{item.title}</strong>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${tone.badge}`}>
              {tone.label}
            </span>
          </span>
          <span className="mt-1 block text-[11px] leading-relaxed text-app-muted">
            {item.message}
          </span>
          {item.occurredAt ? (
            <small className="mt-1.5 block text-[10px] text-app-subtle">
              {timeLabel(item.occurredAt)}
            </small>
          ) : null}
        </span>
        {!item.read ? (
          <span className="mt-1 size-2 shrink-0 rounded-full bg-app-brand" title="Não lida" />
        ) : null}
      </>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-label="Notificações e pendências"
        className="relative grid size-10 place-items-center rounded-lg border border-app-border bg-app-surface text-app-text-soft transition hover:bg-app-surface-hover"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <svg aria-hidden="true" className="size-[18px]" fill="none" viewBox="0 0 24 24">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="M10 21h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
        {(data?.unreadCount ?? 0) > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-[var(--app-header-bg)] bg-rose-500 px-1 text-[9px] font-black leading-none text-white">
            {Math.min(data?.unreadCount ?? 0, 99)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(410px,calc(100vw-28px))] overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-[0_20px_55px_rgba(15,23,42,0.18)] dark:shadow-[0_20px_55px_rgba(0,0,0,0.42)]">
          <header className="flex items-center justify-between gap-3 border-b border-app-border-soft px-4 py-3">
            <div>
              <strong className="block text-sm">Notificações e pendências</strong>
              <small className="text-[10px] text-app-muted">
                {data?.unreadCount ?? 0} não lida(s) · {data?.total ?? 0} ativa(s)
              </small>
            </div>
            {unreadKeys.length ? (
              <button
                className="app-button app-button--secondary app-button--sm"
                onClick={() => void mark(unreadKeys)}
                type="button"
              >
                Marcar lidas
              </button>
            ) : null}
          </header>

          <div className="max-h-[520px] overflow-y-auto p-2">
            {loading && !data ? (
              <div className="grid min-h-[160px] place-items-center text-sm text-app-muted">
                Carregando pendências…
              </div>
            ) : data?.items.length ? (
              <div className="grid gap-1.5">
                {data.items.map((item) => {
                  const tone = SEVERITY[item.severity];
                  return (
                    <Link
                      className={`flex gap-3 rounded-lg border bg-app-surface px-3 py-3 no-underline transition hover:bg-app-surface-hover ${tone.border} ${item.read ? 'opacity-75' : ''}`}
                      href={item.href}
                      key={item.key}
                      onClick={() => {
                        setOpen(false);
                        if (!item.read) void mark([item.key]);
                      }}
                    >
                      {itemContent(item)}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="grid min-h-[180px] place-items-center text-center">
                <div>
                  <span className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    ✓
                  </span>
                  <strong className="block text-sm">Nenhuma pendência ativa</strong>
                  <p className="m-0 mt-1 text-xs text-app-muted">
                    Novos alertas aparecerão aqui automaticamente.
                  </p>
                </div>
              </div>
            )}
          </div>

          <footer className="border-t border-app-border-soft bg-app-surface-muted px-4 py-2 text-[10px] text-app-subtle">
            Atualização automática a cada minuto.
          </footer>
        </div>
      ) : null}
    </div>
  );
}

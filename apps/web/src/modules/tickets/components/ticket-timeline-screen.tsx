"use client";

import {
  AppPermission,
  type CurrentUserResponse,
  type TicketTimelineEntry,
  type TicketTimelineResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { NavigationIcon } from '../../../shared/navigation/navigation-icon';
import { fetchTicketTimeline } from '../api/tickets-api';

const BUTTON =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft transition hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_BUTTON =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-brand bg-app-brand px-4 text-sm font-bold text-app-brand-contrast transition hover:bg-app-brand-hover disabled:cursor-not-allowed disabled:opacity-50';
const CONTROL =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)]';

const INTERACTION_META: Record<
  number,
  { label: string; tone: 'blue' | 'green' | 'amber' | 'rose' | 'slate' }
> = {
  1: { label: 'Registrou', tone: 'blue' },
  2: { label: 'Iniciou', tone: 'green' },
  3: { label: 'Devolveu', tone: 'slate' },
  4: { label: 'Direcionou', tone: 'slate' },
  5: { label: 'Espera', tone: 'amber' },
  6: { label: 'Retomou', tone: 'green' },
  7: { label: 'Interação', tone: 'slate' },
  8: { label: 'Finalizou', tone: 'rose' },
  9: { label: 'Editou', tone: 'slate' },
  10: { label: 'Concluiu', tone: 'rose' },
  11: { label: 'Removeu anexo', tone: 'slate' },
  12: { label: 'Adicionou anexo', tone: 'blue' },
};

const TONE = {
  blue: {
    dot: 'border-sky-500',
    rail: 'bg-sky-400',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  },
  green: {
    dot: 'border-emerald-500',
    rail: 'bg-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  amber: {
    dot: 'border-amber-500',
    rail: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  },
  rose: {
    dot: 'border-rose-500',
    rail: 'bg-rose-400',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  },
  slate: {
    dot: 'border-slate-400',
    rail: 'bg-slate-300 dark:bg-slate-600',
    badge: 'bg-app-surface-muted text-app-text-soft',
  },
} as const;

function canAudit(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.TicketsAudit,
  );
}

function today(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDay(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatTime(value: string | null): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(11, 16) || '--';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatShortDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(5, 10);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function name(value: string | null): string {
  return value?.trim() || '—';
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.status === 403) return 'Seu usuário não possui acesso à Linha do tempo.';
    if (reason.body && typeof reason.body === 'object') {
      const value = (reason.body as Record<string, unknown>).message;
      if (typeof value === 'string') return value;
    }
    return `A API respondeu com erro ${reason.status}.`;
  }
  return reason instanceof Error
    ? reason.message
    : 'Não foi possível carregar a Linha do tempo.';
}

function SummaryCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string | number;
  detail: string;
  accent: 'blue' | 'green' | 'amber' | 'slate';
}) {
  const accentClass =
    accent === 'blue'
      ? 'border-sky-200 bg-sky-50/50 dark:border-sky-900/60 dark:bg-sky-950/20'
      : accent === 'green'
        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20'
        : accent === 'amber'
          ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20'
          : 'border-app-border bg-app-surface';

  return (
    <article className={`rounded-xl border p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10 ${accentClass}`}>
      <span className="text-[10px] font-black uppercase tracking-[0.07em] text-app-muted">
        {label}
      </span>
      <strong className="mt-1.5 block text-2xl leading-none text-app-text">
        {value}
      </strong>
      <small className="mt-2 block text-[11px] text-app-subtle">{detail}</small>
    </article>
  );
}

function TimelineItem({
  item,
  first,
  last,
}: {
  item: TicketTimelineEntry;
  first: boolean;
  last: boolean;
}) {
  const meta = INTERACTION_META[item.interactionType] ?? {
    label: 'Interação',
    tone: 'blue' as const,
  };
  const tone = TONE[meta.tone];

  return (
    <article className="grid grid-cols-[72px_30px_minmax(0,1fr)] gap-3 max-[620px]:grid-cols-[30px_minmax(0,1fr)] max-[620px]:gap-2">
      <div className="pt-3 text-right max-[620px]:col-start-2 max-[620px]:row-start-1 max-[620px]:flex max-[620px]:items-baseline max-[620px]:gap-2 max-[620px]:pt-0 max-[620px]:text-left">
        <strong className="block text-sm text-app-text">{formatTime(item.occurredAt)}</strong>
        <span className="mt-1 block text-[10px] font-bold text-app-subtle max-[620px]:mt-0">
          {formatShortDay(item.occurredAt)}
        </span>
      </div>

      <div className="relative min-h-full max-[620px]:col-start-1 max-[620px]:row-span-2 max-[620px]:row-start-1">
        {!first ? (
          <span className={`absolute -top-3 bottom-1/2 left-1/2 w-px -translate-x-1/2 ${tone.rail}`} />
        ) : null}
        {!last ? (
          <span className={`absolute top-1/2 -bottom-3 left-1/2 w-px -translate-x-1/2 ${tone.rail}`} />
        ) : null}
        <span className={`absolute left-1/2 top-[17px] z-10 size-3.5 -translate-x-1/2 rounded-full border-[3px] bg-app-surface shadow-[0_0_0_4px_var(--app-surface)] max-[620px]:top-[6px] ${tone.dot}`} />
      </div>

      <div className="mb-1 rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 transition hover:border-app-border-strong hover:shadow-md dark:shadow-black/10 max-[620px]:col-start-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${tone.badge}`}>
                {meta.label}
              </span>
              <strong className="text-sm text-app-text">{name(item.actor.name)}</strong>
            </div>
            <p className="m-0 mt-2 whitespace-pre-wrap text-sm leading-relaxed text-app-text-soft">
              {item.description}
            </p>
          </div>
          <Link
            className="inline-flex min-h-8 shrink-0 items-center rounded-lg border border-app-border-strong bg-app-surface-muted px-2.5 text-xs font-extrabold text-app-text-soft no-underline transition hover:border-app-brand hover:text-app-brand"
            href={`/atendimentos/${item.ticketId}`}
          >
            #{String(item.ticketId).padStart(5, '0')}
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-app-border-soft pt-3 text-[11px] text-app-muted">
          <span><b className="text-app-text-soft">Cliente:</b> {name(item.client.name)}</span>
          {item.classification.category ? (
            <span><b className="text-app-text-soft">Categoria:</b> {item.classification.category}</span>
          ) : null}
          {item.classification.subcategory ? (
            <span><b className="text-app-text-soft">Subcategoria:</b> {item.classification.subcategory}</span>
          ) : null}
          {item.location ? (
            <span><b className="text-app-text-soft">Local:</b> {item.location}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function TicketTimelineScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const allowed = canAudit(currentUser);
  const initialDate = useMemo(today, []);
  const [technicianId, setTechnicianId] = useState('');
  const [date, setDate] = useState(initialDate);
  const [appliedTechnicianId, setAppliedTechnicianId] = useState<number | null>(null);
  const [appliedDate, setAppliedDate] = useState(initialDate);
  const [data, setData] = useState<TicketTimelineResponse | null>(null);
  const [loading, setLoading] = useState(allowed);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!allowed) return;

      setLoading(true);
      setError(null);
      try {
        const response = await fetchTicketTimeline(
          appliedTechnicianId,
          appliedDate,
          500,
          signal,
        );
        setData(response);
      } catch (reason: unknown) {
        if (reason instanceof Error && reason.name === 'AbortError') return;
        setError(errorMessage(reason));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [allowed, appliedDate, appliedTechnicianId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (!allowed || !appliedTechnicianId) return;
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [allowed, appliedTechnicianId, load]);

  const selectedTechnician = data?.technicians.find(
    (technician) => technician.id === appliedTechnicianId,
  );

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedTechnicianId(technicianId ? Number(technicianId) : null);
    setAppliedDate(date);
  }

  function goToday() {
    const value = today();
    setDate(value);
    setAppliedDate(value);
    setAppliedTechnicianId(technicianId ? Number(technicianId) : appliedTechnicianId);
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          <button className={BUTTON} disabled={!allowed || loading} onClick={() => void load()} type="button">
            Atualizar
          </button>
        }
        subtitle={
          selectedTechnician
            ? `${selectedTechnician.name} em ${formatDay(appliedDate)}`
            : `Selecione um técnico em ${formatDay(appliedDate)}`
        }
        title="Timeline do Técnico"
        user={currentUser}
      />

      <div className="mx-auto grid w-full max-w-[1500px] gap-4 p-6 max-sm:px-3.5">
        {!allowed ? (
          <div className="rounded-xl border border-app-border bg-app-surface px-4 py-4 text-sm text-app-muted">
            Seu usuário não possui a permissão de auditoria de atendimentos.
          </div>
        ) : null}

        {allowed ? (
          <>
            <section className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
              <SummaryCard
                accent="blue"
                detail="Movimentações realizadas pelo técnico."
                label="Interações"
                value={data?.summary.interactions ?? 0}
              />
              <SummaryCard
                accent="green"
                detail="Chamados distintos movimentados no dia."
                label="Atendimentos"
                value={data?.summary.tickets ?? 0}
              />
              <SummaryCard
                accent="amber"
                detail="Primeiro registro encontrado no período."
                label="Primeira interação"
                value={formatTime(data?.summary.firstInteractionAt ?? null)}
              />
              <SummaryCard
                accent="slate"
                detail="Registro mais recente do técnico."
                label="Última interação"
                value={formatTime(data?.summary.lastInteractionAt ?? null)}
              />
            </section>

            <form
              className="grid grid-cols-[minmax(260px,1fr)_190px_auto_auto] items-end gap-3 rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10 max-[820px]:grid-cols-2 max-[520px]:grid-cols-1"
              onSubmit={applyFilters}
            >
              <label className="grid gap-1.5 text-xs font-extrabold text-app-muted">
                <span>Técnico</span>
                <select
                  className={CONTROL}
                  onChange={(event) => setTechnicianId(event.target.value)}
                  value={technicianId}
                >
                  <option value="">Selecione um técnico</option>
                  {data?.technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-extrabold text-app-muted">
                <span>Data</span>
                <input
                  className={CONTROL}
                  onChange={(event) => setDate(event.target.value)}
                  required
                  type="date"
                  value={date}
                />
              </label>

              <button className={PRIMARY_BUTTON} disabled={loading} type="submit">
                <NavigationIcon className="size-4" name="list" />
                Filtrar
              </button>
              <button className={BUTTON} disabled={loading} onClick={goToday} type="button">
                Hoje
              </button>
            </form>

            {error ? (
              <div className="rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger" role="alert">
                {error}
              </div>
            ) : null}

            <section className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm shadow-slate-950/5 dark:shadow-black/10">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-app-brand-soft text-app-brand">
                    <NavigationIcon className="size-4" name="clock" />
                  </span>
                  <div>
                    <h2 className="m-0 text-sm font-extrabold">Interações do dia</h2>
                    <p className="m-0 mt-0.5 text-[11px] text-app-muted">
                      {selectedTechnician
                        ? `${selectedTechnician.name} · ${formatDay(appliedDate)}`
                        : 'Escolha um técnico para consultar a atividade diária.'}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-app-surface-muted px-2.5 py-1 text-[11px] font-bold text-app-muted">
                  {data?.summary.interactions ?? 0} registro(s)
                </span>
              </header>

              <div className="p-4 max-sm:p-3">
                {loading && !data ? (
                  <div className="grid min-h-[230px] place-items-center text-sm text-app-muted">
                    Carregando timeline…
                  </div>
                ) : !appliedTechnicianId ? (
                  <div className="grid min-h-[260px] place-items-center text-center">
                    <div className="grid max-w-sm justify-items-center gap-3">
                      <span className="grid size-12 place-items-center rounded-2xl bg-app-surface-muted text-app-subtle">
                        <NavigationIcon className="size-6" name="clock" />
                      </span>
                      <div>
                        <strong className="block text-sm text-app-text">Selecione um técnico</strong>
                        <p className="m-0 mt-1 text-xs leading-relaxed text-app-muted">
                          Escolha o técnico e a data acima para visualizar todas as interações registradas naquele dia.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : data?.items.length ? (
                  <div className="grid gap-2">
                    {data.items.map((item, index) => (
                      <TimelineItem
                        first={index === 0}
                        item={item}
                        key={item.interactionId}
                        last={index === data.items.length - 1}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid min-h-[230px] place-items-center text-center">
                    <div className="grid max-w-sm justify-items-center gap-3">
                      <span className="grid size-12 place-items-center rounded-2xl bg-app-surface-muted text-app-subtle">
                        <NavigationIcon className="size-6" name="clock" />
                      </span>
                      <div>
                        <strong className="block text-sm text-app-text">Nenhuma interação encontrada</strong>
                        <p className="m-0 mt-1 text-xs text-app-muted">
                          Não existem interações desse técnico em {formatDay(appliedDate)}.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

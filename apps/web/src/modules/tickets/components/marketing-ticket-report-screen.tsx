"use client";

import type {
  CurrentUserResponse,
  MarketingTicketCatalogsResponse,
  MarketingTicketListResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { fetchMarketingCreateCatalogs } from '../api/modular-ticket-create-api';
import {
  fetchMarketingTickets,
  type SpecializedTicketListQuery,
} from '../api/modular-ticket-read-api';

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft no-underline transition-colors hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_BUTTON_CLASS = `${BUTTON_CLASS} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;
const FIELD_CONTROL_CLASS =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';
const FIELD_LABEL_CLASS = 'text-xs font-extrabold text-app-muted';
const TABLE_CELL_CLASS =
  'border-b border-app-border-soft px-3 py-3 align-top text-left text-[13px]';
const TABLE_HEADER_CLASS =
  'sticky top-0 border-b border-app-border-soft bg-app-surface-muted px-3 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-app-muted';

interface Draft {
  clientId: string;
  technicianId: string;
  openedFrom: string;
  openedTo: string;
}

function localToday(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function initialDraft(): Draft {
  const today = localToday();
  return { clientId: '', technicianId: '', openedFrom: today, openedTo: today };
}

function initialQuery(draft: Draft): SpecializedTicketListQuery {
  return {
    page: 1,
    limit: 50,
    status: '1,2,3,4',
    openedFrom: draft.openedFrom,
    openedTo: draft.openedTo,
    sort: 'openedAt',
    direction: 'asc',
  };
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function duration(openedAt: string | null, closedAt: string | null): string {
  if (!openedAt || !closedAt) return 'Em aberto';
  const opened = new Date(openedAt).getTime();
  const closed = new Date(closedAt).getTime();
  if (!Number.isFinite(opened) || !Number.isFinite(closed) || closed < opened) return '—';
  return `${Math.floor((closed - opened) / 3_600_000).toLocaleString('pt-BR')} h`;
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.status === 403) {
      return 'Seu usuário não possui acesso ao relatório de Marketing.';
    }
    return `A API respondeu com erro ${reason.status}.`;
  }
  return reason instanceof Error
    ? reason.message
    : 'Não foi possível carregar o relatório de Marketing.';
}

export function MarketingTicketReportScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft());
  const [query, setQuery] = useState<SpecializedTicketListQuery>(() =>
    initialQuery(initialDraft()),
  );
  const [result, setResult] = useState<MarketingTicketListResponse | null>(null);
  const [catalogs, setCatalogs] = useState<MarketingTicketCatalogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketingCreateCatalogs()
      .then(setCatalogs)
      .catch((reason: unknown) => setError(errorMessage(reason)));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchMarketingTickets(query, controller.signal)
      .then(setResult)
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === 'AbortError') return;
        setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query]);

  const totalLabel = useMemo(() => {
    if (!result) return 'Carregando…';
    return `${result.meta.total.toLocaleString('pt-BR')} registro${
      result.meta.total === 1 ? '' : 's'
    }`;
  }, [result]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery((current) => ({
      ...current,
      page: 1,
      clientId: draft.clientId || undefined,
      technicianId: draft.technicianId || undefined,
      openedFrom: draft.openedFrom || undefined,
      openedTo: draft.openedTo || undefined,
    }));
  }

  function reset() {
    const next = initialDraft();
    setDraft(next);
    setQuery(initialQuery(next));
  }

  const page = result?.meta.page ?? query.page;
  const totalPages = result?.meta.totalPages ?? 0;

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-5 border-b border-app-border bg-[var(--app-header-bg)] px-6 py-3.5 backdrop-blur-xl max-sm:px-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <AppSidebar />
          <Link className="flex items-baseline gap-2.5 no-underline" href="/painel">
            <strong className="text-lg text-app-text">Helpdesk</strong>
            <span className="text-[13px] text-app-subtle max-sm:hidden">Nova plataforma</span>
          </Link>
        </div>
        <div className="flex items-center justify-end gap-3">
          <span className="text-sm text-app-muted max-sm:hidden">{totalLabel}</span>
          <SessionUserMenu user={currentUser} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-6 py-6 max-sm:px-3.5">
        <div className="mb-[18px] flex items-end justify-between gap-6 max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
          <div>
            <span className="mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
              Atendimentos · Marketing · Relatório
            </span>
            <h1 className="m-0 text-[28px] font-bold tracking-tight text-app-text">
              Tarefas por cliente e técnico
            </h1>
            <p className="mt-1.5 max-w-4xl text-app-muted-strong">
              Leitura analítica das demandas de Marketing. Marketing não possui SLA; a duração abaixo é apenas o intervalo entre abertura e fechamento.
            </p>
          </div>
          <Link className={BUTTON_CLASS} href="/atendimentos/marketing">Voltar para atendimentos</Link>
        </div>

        <form
          className="mb-4 rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10"
          onSubmit={submit}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="grid gap-1.5">
              <label className={FIELD_LABEL_CLASS} htmlFor="marketing-report-client">Cliente</label>
              <select
                className={FIELD_CONTROL_CLASS}
                id="marketing-report-client"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, clientId: event.target.value }))
                }
                value={draft.clientId}
              >
                <option value="">Todos os clientes</option>
                {(catalogs?.clients ?? []).map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className={FIELD_LABEL_CLASS} htmlFor="marketing-report-technician">Técnico</label>
              <select
                className={FIELD_CONTROL_CLASS}
                id="marketing-report-technician"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, technicianId: event.target.value }))
                }
                value={draft.technicianId}
              >
                <option value="">Todos</option>
                {(catalogs?.technicians ?? [])
                  .filter((option) => option.id > 0)
                  .map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className={FIELD_LABEL_CLASS} htmlFor="marketing-report-from">De</label>
              <input
                className={FIELD_CONTROL_CLASS}
                id="marketing-report-from"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, openedFrom: event.target.value }))
                }
                type="date"
                value={draft.openedFrom}
              />
            </div>
            <div className="grid gap-1.5">
              <label className={FIELD_LABEL_CLASS} htmlFor="marketing-report-to">Até</label>
              <input
                className={FIELD_CONTROL_CLASS}
                id="marketing-report-to"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, openedTo: event.target.value }))
                }
                type="date"
                value={draft.openedTo}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2 max-sm:[&>*]:flex-1">
            <button className={BUTTON_CLASS} disabled={loading} onClick={reset} type="button">
              Hoje
            </button>
            <button className={PRIMARY_BUTTON_CLASS} disabled={loading} type="submit">
              Filtrar
            </button>
          </div>
        </form>

        {loading ? (
          <div
            className="mb-3 h-1 overflow-hidden rounded-full bg-app-border"
            aria-label="Carregando"
            role="progressbar"
          >
            <div className="h-full w-1/3 animate-pulse rounded-full bg-app-brand" />
          </div>
        ) : null}
        {error ? (
          <div
            className="mb-4 rounded-lg border border-app-danger-border bg-app-danger-soft px-4 py-3.5 text-sm text-app-danger"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <section
          className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm shadow-slate-950/5 dark:shadow-black/10"
          aria-label="Relatório de tarefas de Marketing"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] border-collapse">
              <thead>
                <tr>
                  <th className={TABLE_HEADER_CLASS}>ID</th>
                  <th className={TABLE_HEADER_CLASS}>Cliente</th>
                  <th className={TABLE_HEADER_CLASS}>Solicitante / Local</th>
                  <th className={TABLE_HEADER_CLASS}>Classificação</th>
                  <th className={TABLE_HEADER_CLASS}>Técnico</th>
                  <th className={TABLE_HEADER_CLASS}>Abertura</th>
                  <th className={TABLE_HEADER_CLASS}>Fechamento</th>
                  <th className={TABLE_HEADER_CLASS}>Duração</th>
                </tr>
              </thead>
              <tbody>
                {(result?.data ?? []).map((ticket) => (
                  <tr className="transition-colors hover:bg-app-surface-muted" key={ticket.id}>
                    <td className={`${TABLE_CELL_CLASS} font-extrabold`}>
                      <Link
                        className="font-extrabold text-app-brand no-underline hover:underline focus-visible:underline"
                        href={`/atendimentos/marketing/${ticket.id}`}
                      >
                        #{ticket.id}
                      </Link>
                    </td>
                    <td className={TABLE_CELL_CLASS}>{ticket.client.name || '—'}</td>
                    <td className={TABLE_CELL_CLASS}>
                      <div className="grid min-w-[180px] gap-0.5">
                        <strong className="text-app-text">{ticket.requester.name || '—'}</strong>
                        <span className="text-app-muted-strong">{ticket.location.name || '—'}</span>
                      </div>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <div className="grid min-w-[220px] gap-0.5">
                        <strong className="text-app-text">{ticket.type.name || ticket.category.name || '—'}</strong>
                        <span className="text-app-muted-strong">
                          {[ticket.category.name, ticket.subcategory.name, ticket.level.name]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                      </div>
                    </td>
                    <td className={TABLE_CELL_CLASS}>{ticket.technician.name || 'Não atribuído'}</td>
                    <td className={TABLE_CELL_CLASS}>{formatDate(ticket.openedAt)}</td>
                    <td className={TABLE_CELL_CLASS}>{formatDate(ticket.closedAt)}</td>
                    <td className={TABLE_CELL_CLASS}>{duration(ticket.openedAt, ticket.closedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !error && result?.data.length === 0 ? (
            <div className="px-5 py-10 text-center text-app-muted-strong">
              Nenhuma tarefa de Marketing encontrada para o período.
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 max-sm:flex-col max-sm:items-stretch">
            <span className="text-[13px] text-app-muted-strong">
              Página {page}{totalPages > 0 ? ` de ${totalPages}` : ''}
            </span>
            <div className="flex gap-2 max-sm:[&>*]:flex-1">
              <button
                className={BUTTON_CLASS}
                disabled={loading || page <= 1}
                onClick={() =>
                  setQuery((current) => ({ ...current, page: Math.max(1, current.page - 1) }))
                }
                type="button"
              >
                Anterior
              </button>
              <button
                className={BUTTON_CLASS}
                disabled={loading || totalPages === 0 || page >= totalPages}
                onClick={() =>
                  setQuery((current) => ({ ...current, page: current.page + 1 }))
                }
                type="button"
              >
                Próxima
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import type {
  CurrentUserResponse,
  MarketingTicketListResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import {
  fetchMarketingTickets,
  type SpecializedTicketListQuery,
} from '../api/modular-ticket-read-api';

const ACTIVE_STATUS = '1,2,3';

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft no-underline transition-colors hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_BUTTON_CLASS = `${BUTTON_CLASS} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;
const FIELD_CONTROL_CLASS =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';
const TABLE_CELL_CLASS =
  'border-b border-app-border-soft px-3 py-3 align-top text-left text-[13px]';
const TABLE_HEADER_CLASS =
  'sticky top-0 border-b border-app-border-soft bg-app-surface-muted px-3 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-app-muted';
const FIELD_LABEL_CLASS = 'text-xs font-extrabold text-app-muted';

interface Draft {
  search: string;
  status: string;
  openedFrom: string;
  openedTo: string;
}

const EMPTY_DRAFT: Draft = {
  search: '',
  status: ACTIVE_STATUS,
  openedFrom: '',
  openedTo: '',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.status === 403) {
      return 'Seu usuário não possui acesso aos tickets de Marketing.';
    }
    return `A API respondeu com erro ${reason.status}.`;
  }
  return reason instanceof Error
    ? reason.message
    : 'Não foi possível carregar os tickets de Marketing.';
}

export function MarketingTicketsScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [query, setQuery] = useState<SpecializedTicketListQuery>({
    page: 1,
    limit: 50,
    status: ACTIVE_STATUS,
    sort: 'status',
    direction: 'asc',
  });
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [result, setResult] = useState<MarketingTicketListResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return `${result.meta.total.toLocaleString('pt-BR')} ticket${
      result.meta.total === 1 ? '' : 's'
    }`;
  }, [result]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery((current) => ({
      ...current,
      page: 1,
      search: draft.search.trim() || undefined,
      status: draft.status,
      openedFrom: draft.openedFrom || undefined,
      openedTo: draft.openedTo || undefined,
    }));
  }

  function clear() {
    setDraft(EMPTY_DRAFT);
    setQuery({
      page: 1,
      limit: 50,
      status: ACTIVE_STATUS,
      sort: 'status',
      direction: 'asc',
    });
  }

  const page = result?.meta.page ?? query.page;
  const totalPages = result?.meta.totalPages ?? 0;

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-5 border-b border-app-border bg-[var(--app-header-bg)] px-6 py-3.5 backdrop-blur-xl max-sm:px-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <AppSidebar />
          <Link
            className="flex items-baseline gap-2.5 no-underline"
            href="/dashboard"
          >
            <strong className="text-lg text-app-text">Helpdesk</strong>
            <span className="text-[13px] text-app-subtle max-sm:hidden">
              Nova plataforma
            </span>
          </Link>
        </div>
        <div className="flex items-center justify-end gap-3">
          <span className="text-sm text-app-muted max-sm:hidden">
            {totalLabel}
          </span>
          <SessionUserMenu user={currentUser} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-6 py-6 max-sm:px-3.5">
        <div className="mb-[18px] flex items-end justify-between gap-6 max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
          <div>
            <span className="mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
              Tickets · Marketing
            </span>
            <h1 className="m-0 text-[28px] font-bold tracking-tight text-app-text">
              Marketing
            </h1>
            <p className="mt-1.5 text-app-muted-strong">
              Demandas do terceiro andar com classificação e fluxo próprios,
              sem SLA.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 max-sm:[&>*]:flex-1">
            <Link
              className={BUTTON_CLASS}
              href="/tickets/marketing/reports/tasks"
            >
              Relatório
            </Link>
            <Link
              className={PRIMARY_BUTTON_CLASS}
              href="/tickets/new?type=marketing"
            >
              Novo ticket
            </Link>
          </div>
        </div>

        <form
          className="mb-4 rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10"
          onSubmit={submit}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="grid gap-1.5">
              <label
                className={FIELD_LABEL_CLASS}
                htmlFor="marketing-ticket-search"
              >
                Busca
              </label>
              <input
                className={FIELD_CONTROL_CLASS}
                id="marketing-ticket-search"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                placeholder="Nome, descrição ou cliente"
                type="search"
                value={draft.search}
              />
            </div>
            <div className="grid gap-1.5">
              <label
                className={FIELD_LABEL_CLASS}
                htmlFor="marketing-ticket-status"
              >
                Status
              </label>
              <select
                className={FIELD_CONTROL_CLASS}
                id="marketing-ticket-status"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                value={draft.status}
              >
                <option value="1,2,3">Ativos</option>
                <option value="0">Agendados</option>
                <option value="4">Concluídos</option>
                <option value="0,1,2,3,4">Todos</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <label
                className={FIELD_LABEL_CLASS}
                htmlFor="marketing-ticket-opened-from"
              >
                Abertura de
              </label>
              <input
                className={FIELD_CONTROL_CLASS}
                id="marketing-ticket-opened-from"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    openedFrom: event.target.value,
                  }))
                }
                type="date"
                value={draft.openedFrom}
              />
            </div>
            <div className="grid gap-1.5">
              <label
                className={FIELD_LABEL_CLASS}
                htmlFor="marketing-ticket-opened-to"
              >
                Abertura até
              </label>
              <input
                className={FIELD_CONTROL_CLASS}
                id="marketing-ticket-opened-to"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    openedTo: event.target.value,
                  }))
                }
                type="date"
                value={draft.openedTo}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2 max-sm:[&>*]:flex-1">
            <button
              className={BUTTON_CLASS}
              disabled={loading}
              onClick={clear}
              type="button"
            >
              Limpar
            </button>
            <button
              className={PRIMARY_BUTTON_CLASS}
              disabled={loading}
              type="submit"
            >
              Aplicar filtros
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
          aria-label="Lista de tickets de Marketing"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse">
              <thead>
                <tr>
                  <th className={TABLE_HEADER_CLASS}>ID</th>
                  <th className={TABLE_HEADER_CLASS}>Ticket</th>
                  <th className={TABLE_HEADER_CLASS}>Cliente</th>
                  <th className={TABLE_HEADER_CLASS}>Classificação</th>
                  <th className={TABLE_HEADER_CLASS}>Técnico</th>
                  <th className={TABLE_HEADER_CLASS}>Status</th>
                  <th className={TABLE_HEADER_CLASS}>Abertura</th>
                </tr>
              </thead>
              <tbody>
                {(result?.data ?? []).map((ticket) => (
                  <tr
                    className="transition-colors hover:bg-app-surface-muted"
                    key={ticket.id}
                  >
                    <td className={`${TABLE_CELL_CLASS} font-extrabold`}>
                      <Link
                        className="text-app-brand no-underline hover:underline focus-visible:underline"
                        href={`/tickets/marketing/${ticket.id}`}
                      >
                        #{ticket.id}
                      </Link>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <div className="grid min-w-[220px] gap-0.5">
                        <strong className="text-[13px] text-app-text">
                          {ticket.name || 'Sem nome'}
                        </strong>
                        <span className="max-w-[360px] overflow-hidden text-ellipsis whitespace-nowrap text-app-muted-strong">
                          {ticket.openingDescription || 'Sem descrição'}
                        </span>
                      </div>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      {ticket.client.name || '—'}
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      {[ticket.type.name, ticket.category.name, ticket.subcategory.name]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      {ticket.technician.name || 'Não atribuído'}
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-app-surface-muted px-2 py-1 text-xs font-extrabold text-app-text-soft">
                        {ticket.statusLabel}
                      </span>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      {formatDate(ticket.openedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && !error && result?.data.length === 0 ? (
            <div className="px-5 py-10 text-center text-app-muted-strong">
              Nenhum ticket de Marketing encontrado com os filtros atuais.
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 px-4 py-3.5 max-sm:flex-col max-sm:items-stretch">
            <span className="text-[13px] text-app-muted-strong">
              Página {page}
              {totalPages > 0 ? ` de ${totalPages}` : ''}
            </span>
            <div className="flex gap-2 max-sm:[&>*]:flex-1">
              <button
                className={BUTTON_CLASS}
                disabled={loading || page <= 1}
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    page: Math.max(1, current.page - 1),
                  }))
                }
                type="button"
              >
                Anterior
              </button>
              <button
                className={BUTTON_CLASS}
                disabled={loading || totalPages === 0 || page >= totalPages}
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    page: current.page + 1,
                  }))
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

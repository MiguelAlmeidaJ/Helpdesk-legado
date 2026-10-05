"use client";

import {
  AppPermission,
  type CurrentUserResponse,
  type TicketFilterOption,
  type TicketListItem,
  type TicketListResponse,
  type TicketStatusCard,
} from '@helpdesk/contracts';
import Link from 'next/link';
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { appButtonClass } from '../../../shared/ui/button-styles';
import { SearchSelect } from '../../../shared/ui/search-select';
import {
  fetchTickets,
  type TicketListQuery,
} from '../api/tickets-api';
import { TicketListActions } from './ticket-list-actions';
import { TicketSlaIndicators } from './sla-indicator';

const DEFAULT_STATUS = '1,2,3,5';

const BUTTON_CLASS = appButtonClass('secondary');
const PRIMARY_BUTTON_CLASS = appButtonClass('primary');
const FIELD_CONTROL_CLASS =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';

interface FilterDraft {
  search: string;
  clientId: string;
  technicianIds: string[];
  openedFrom: string;
  openedTo: string;
}

const EMPTY_DRAFT: FilterDraft = {
  search: '',
  clientId: '',
  technicianIds: [],
  openedFrom: '',
  openedTo: '',
};

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function partyName(option: TicketFilterOption): string {
  return option.name || `#${option.id}`;
}

function ticketDescription(ticket: TicketListItem): string {
  return (
    ticket.openingDescription?.trim() ||
    ticket.item.name ||
    ticket.subcategory.name ||
    'Sem descrição'
  );
}

function buildQuery(
  draft: FilterDraft,
  current: TicketListQuery,
): TicketListQuery {
  return {
    ...current,
    page: 1,
    search: draft.search.trim() || undefined,
    clientId: draft.clientId || undefined,
    requesterId: undefined,
    technicianId:
      draft.technicianIds.length > 0
        ? draft.technicianIds.join(',')
        : undefined,
    openedFrom: draft.openedFrom || undefined,
    openedTo: draft.openedTo || undefined,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Sua sessão expirou ou deixou de ser válida. Entre novamente para continuar.';
    }

    if (error.status === 403) {
      return 'Seu usuário não possui permissão para consultar atendimentos.';
    }

    return `A API respondeu com erro ${error.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Não foi possível carregar os atendimentos.';
}

function StatusCards({
  cards,
  selectedStatus,
  disabled,
  onSelect,
}: {
  cards: TicketStatusCard[];
  selectedStatus: string;
  disabled: boolean;
  onSelect: (card: TicketStatusCard) => void;
}) {
  return (
    <div
      className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-7"
      aria-label="Resumo por status"
    >
      {cards.map((card) => {
        const cardStatus = card.statuses.join(',');
        const active = cardStatus === selectedStatus;

        return (
          <button
            className={`min-h-20 rounded-xl border bg-app-surface px-3.5 py-3 text-left transition hover:border-app-brand disabled:cursor-not-allowed disabled:opacity-55 ${
              active
                ? 'border-app-brand ring-1 ring-app-brand'
                : 'border-app-border'
            }`}
            aria-pressed={active}
            disabled={disabled}
            key={card.key}
            onClick={() => onSelect(card)}
            type="button"
          >
            <span className="block text-xs font-bold text-app-muted-strong">
              {card.label}
            </span>
            <strong className="mt-1.5 block text-2xl text-app-text">
              {card.total.toLocaleString('pt-BR')}
            </strong>
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <label className="text-xs font-extrabold text-app-muted" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export function TicketsScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [query, setQuery] = useState<TicketListQuery>({
    page: 1,
    limit: 50,
    status: DEFAULT_STATUS,
    sort: 'sla',
    direction: 'asc',
  });
  const [draft, setDraft] = useState<FilterDraft>(EMPTY_DRAFT);
  const [result, setResult] = useState<TicketListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetchTickets(query, controller.signal)
      .then((response) => {
        setResult(response);
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === 'AbortError') {
          return;
        }

        setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchTickets(query)
        .then((response) => setResult(response))
        .catch(() => {
          // O refresh silencioso não substitui a última lista válida.
        });
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [query]);

  const totalLabel = useMemo(() => {
    if (!result) {
      return 'Carregando…';
    }

    return `${result.meta.total.toLocaleString('pt-BR')} atendimento${
      result.meta.total === 1 ? '' : 's'
    }`;
  }, [result]);

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery((current) => buildQuery(draft, current));
  }

  function clearFilters() {
    setDraft(EMPTY_DRAFT);
    setQuery({
      page: 1,
      limit: 50,
      status: DEFAULT_STATUS,
      sort: 'sla',
      direction: 'asc',
    });
  }

  function selectStatus(card: TicketStatusCard) {
    setQuery((current) => ({
      ...current,
      page: 1,
      status: card.statuses.join(','),
    }));
  }

  async function refreshList() {
    try {
      const response = await fetchTickets(query);
      setResult(response);
    } catch {
      // A ação já foi concluída; o próximo refresh automático tenta novamente.
    }
  }

  const meta = result?.meta;
  const currentPage = meta?.page ?? query.page;
  const totalPages = meta?.totalPages ?? 0;

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          currentUser.grants.some(
            (grant) =>
              grant.permission === AppPermission.SystemAdmin ||
              grant.permission === AppPermission.TicketsCreate,
          ) ? (
            <Link className={PRIMARY_BUTTON_CLASS} href="/atendimentos/novo">
              Novo atendimento
            </Link>
          ) : null
        }
        meta={<span className="text-sm text-app-muted max-md:hidden">{totalLabel}</span>}
        subtitle="Consulte, filtre e acompanhe os atendimentos da operação."
        title="Atendimentos"
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1500px] px-6 py-6 max-sm:px-3.5">

        {result ? (
          <StatusCards
            cards={result.statusCards}
            disabled={loading}
            onSelect={selectStatus}
            selectedStatus={query.status ?? DEFAULT_STATUS}
          />
        ) : null}

        <form
          className="mb-4 rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10"
          onSubmit={submitFilters}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="ticket-search">Busca</FieldLabel>
              <input
                className={FIELD_CONTROL_CLASS}
                id="ticket-search"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                placeholder="Descrição do atendimento"
                type="search"
                value={draft.search}
              />
            </div>

            <div className="grid gap-1.5">
              <FieldLabel htmlFor="ticket-client">Cliente</FieldLabel>
              <SearchSelect
                id="ticket-client"
                onChange={(values) =>
                  setDraft((current) => ({
                    ...current,
                    clientId: values[0] ?? '',
                  }))
                }
                options={(result?.options.clients ?? []).map((option) => ({
                  value: String(option.id),
                  label: partyName(option),
                }))}
                placeholder="Todos"
                searchPlaceholder="Pesquisar cliente..."
                value={draft.clientId ? [draft.clientId] : []}
              />
            </div>

            <div className="grid gap-1.5">
              <FieldLabel htmlFor="ticket-technician">Técnico</FieldLabel>
              <SearchSelect
                id="ticket-technician"
                multiple
                multipleLabel="técnicos selecionados"
                onChange={(values) =>
                  setDraft((current) => ({
                    ...current,
                    technicianIds: values,
                  }))
                }
                options={(result?.options.technicians ?? []).map((option) => ({
                  value: String(option.id),
                  label: partyName(option),
                }))}
                placeholder="Todos"
                searchPlaceholder="Pesquisar técnico..."
                value={draft.technicianIds}
              />
            </div>

            <div className="grid gap-1.5">
              <FieldLabel htmlFor="ticket-opened-from">Abertura de</FieldLabel>
              <input
                className={FIELD_CONTROL_CLASS}
                id="ticket-opened-from"
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
              <FieldLabel htmlFor="ticket-opened-to">Abertura até</FieldLabel>
              <input
                className={FIELD_CONTROL_CLASS}
                id="ticket-opened-to"
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
              onClick={clearFilters}
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
          className="rounded-xl border border-app-border bg-app-surface p-3 shadow-sm shadow-slate-950/5 dark:shadow-black/10"
          aria-label="Lista de atendimentos"
        >
          <div className="grid gap-3">
            {(result?.data ?? []).map((ticket) => (
              <article
                className={[
                  'overflow-hidden rounded-xl border bg-app-surface transition',
                  ticket.sla.quality.breached
                    ? 'border-red-300 bg-red-50/60 dark:border-red-900/70 dark:bg-red-950/15'
                    : 'border-app-border hover:border-app-border-strong hover:shadow-sm',
                ].join(' ')}
                key={ticket.id}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-app-border-soft bg-app-surface-muted/65 px-4 py-3 max-[760px]:grid-cols-1">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link
                        className="text-sm font-extrabold text-app-brand no-underline hover:underline"
                        href={`/atendimentos/${ticket.id}`}
                      >
                        #{ticket.id}
                      </Link>
                      <span className="text-app-subtle">•</span>
                      <strong className="truncate text-sm text-app-text">
                        {ticket.category.name || 'Sem categoria'}
                        {ticket.subcategory.name
                          ? ` · ${ticket.subcategory.name}`
                          : ''}
                      </strong>
                    </div>
                    <p
                      className="m-0 mt-1 line-clamp-2 text-sm leading-5 text-app-muted-strong"
                      title={ticketDescription(ticket)}
                    >
                      {ticketDescription(ticket)}
                    </p>
                  </div>

                  <div className="flex items-start justify-end gap-2 max-[760px]:justify-start">
                    <TicketListActions
                      currentUser={currentUser}
                      onChanged={refreshList}
                      ticket={ticket}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[1.2fr_1.1fr_1.1fr_1fr_auto] gap-x-5 gap-y-3 px-4 py-3.5 max-[1050px]:grid-cols-3 max-[720px]:grid-cols-2 max-[480px]:grid-cols-1">
                  <div>
                    <span className="block text-[10px] font-extrabold uppercase tracking-[0.05em] text-app-subtle">
                      Cliente
                    </span>
                    <strong className="mt-1 block text-sm font-semibold text-app-text-soft">
                      {ticket.client.name || '—'}
                    </strong>
                    {ticket.location.name ? (
                      <span className="mt-0.5 block text-xs text-app-muted">
                        {ticket.location.name}
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <span className="block text-[10px] font-extrabold uppercase tracking-[0.05em] text-app-subtle">
                      Solicitante
                    </span>
                    <strong className="mt-1 block text-sm font-semibold text-app-text-soft">
                      {ticket.requester.name || '—'}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-[10px] font-extrabold uppercase tracking-[0.05em] text-app-subtle">
                      Técnico
                    </span>
                    <strong className="mt-1 block text-sm font-semibold text-app-text-soft">
                      {ticket.technician.name || 'Não atribuído'}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-[10px] font-extrabold uppercase tracking-[0.05em] text-app-subtle">
                      Status
                    </span>
                    <span className="mt-1 inline-flex items-center whitespace-nowrap rounded-full bg-app-surface-muted px-2.5 py-1 text-xs font-extrabold text-app-text-soft ring-1 ring-inset ring-app-border-soft">
                      {ticket.statusLabel}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-extrabold uppercase tracking-[0.05em] text-app-subtle">
                      Abertura
                    </span>
                    <strong className="mt-1 block whitespace-nowrap text-sm font-semibold text-app-text-soft">
                      {formatDate(ticket.openedAt)}
                    </strong>
                  </div>
                </div>

                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border-soft px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-app-muted">
                    {ticket.level ? (
                      <span className="rounded-full bg-app-surface-muted px-2 py-1 font-bold">
                        N{ticket.level}
                      </span>
                    ) : null}
                    {ticket.recurrent ? (
                      <span className="rounded-full bg-app-brand-soft px-2 py-1 font-bold text-app-brand">
                        Recorrente
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.05em] text-app-subtle">
                      SLA
                    </span>
                    <TicketSlaIndicators clerio={ticket.sla.clerio} />
                  </div>
                </footer>
              </article>
            ))}
          </div>

          {!loading && !error && result?.data.length === 0 ? (
            <div className="px-5 py-10 text-center text-app-muted-strong">
              Nenhum atendimento encontrado com os filtros atuais.
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-app-border-soft px-1 pt-3.5 max-sm:flex-col max-sm:items-stretch">
            <span className="text-[13px] text-app-muted-strong">
              Página {currentPage}
              {totalPages > 0 ? ` de ${totalPages}` : ''}
            </span>

            <div className="flex gap-2 max-sm:[&>*]:flex-1">
              <button
                className={BUTTON_CLASS}
                disabled={loading || currentPage <= 1}
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
                disabled={
                  loading ||
                  totalPages === 0 ||
                  currentPage >= totalPages
                }
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
        </section>
      </div>
    </main>
  );
}

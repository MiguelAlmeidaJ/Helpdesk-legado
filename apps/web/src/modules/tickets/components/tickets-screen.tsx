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
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import {
  fetchTickets,
  type TicketListQuery,
} from '../api/tickets-api';
import { SlaIndicator } from './sla-indicator';

const DEFAULT_STATUS = '1,2,3,5';

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft no-underline transition-colors hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_BUTTON_CLASS = `${BUTTON_CLASS} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;
const FIELD_CONTROL_CLASS =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';
const TABLE_CELL_CLASS =
  'border-b border-app-border-soft px-3 py-3 align-top text-left text-[13px]';
const TABLE_HEADER_CLASS =
  'sticky top-0 border-b border-app-border-soft bg-app-surface-muted px-3 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-app-muted';

interface FilterDraft {
  search: string;
  clientId: string;
  requesterId: string;
  technicianId: string;
  openedFrom: string;
  openedTo: string;
}

const EMPTY_DRAFT: FilterDraft = {
  search: '',
  clientId: '',
  requesterId: '',
  technicianId: '',
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

function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return 'Sem SLA';
  }

  const overdue = seconds < 0;
  const absolute = Math.abs(seconds);
  const days = Math.floor(absolute / 86400);
  const hours = Math.floor((absolute % 86400) / 3600);
  const minutes = Math.floor((absolute % 3600) / 60);

  const parts = [
    days > 0 ? `${days}d` : '',
    hours > 0 ? `${hours}h` : '',
    `${minutes}min`,
  ].filter(Boolean);

  return `${overdue ? 'Atrasado ' : ''}${parts.join(' ')}`;
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
    requesterId:
      draft.clientId && draft.requesterId
        ? draft.requesterId
        : undefined,
    technicianId: draft.technicianId || undefined,
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

  const meta = result?.meta;
  const currentPage = meta?.page ?? query.page;
  const totalPages = meta?.totalPages ?? 0;

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-5 border-b border-app-border bg-[var(--app-header-bg)] px-6 py-3.5 backdrop-blur-xl max-sm:px-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <AppSidebar />
          <Link
            className="flex items-baseline gap-2.5 no-underline"
            href="/painel"
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
              Operação
            </span>
            <h1 className="m-0 text-[28px] font-bold tracking-tight text-app-text">
              Atendimentos
            </h1>
            <p className="mt-1.5 text-app-muted-strong">
              Consulte, filtre e acompanhe os atendimentos da operação.
            </p>
          </div>
          {currentUser.grants.some(
            (grant) =>
              grant.permission === AppPermission.SystemAdmin ||
              grant.permission === AppPermission.TicketsCreate,
          ) ? (
            <Link className={PRIMARY_BUTTON_CLASS} href="/atendimentos/novo">
              Novo atendimento
            </Link>
          ) : null}
        </div>

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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="grid gap-1.5 xl:col-span-1">
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
              <select
                className={FIELD_CONTROL_CLASS}
                id="ticket-client"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    clientId: event.target.value,
                    requesterId: '',
                  }))
                }
                value={draft.clientId}
              >
                <option value="">Todos</option>
                {(result?.options.clients ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {partyName(option)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <FieldLabel htmlFor="ticket-requester">Solicitante</FieldLabel>
              <select
                className={FIELD_CONTROL_CLASS}
                disabled={!draft.clientId}
                id="ticket-requester"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    requesterId: event.target.value,
                  }))
                }
                value={draft.requesterId}
              >
                <option value="">
                  {draft.clientId ? 'Todos' : 'Selecione um cliente'}
                </option>
                {(result?.options.requesters ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {partyName(option)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <FieldLabel htmlFor="ticket-technician">Técnico</FieldLabel>
              <select
                className={FIELD_CONTROL_CLASS}
                id="ticket-technician"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    technicianId: event.target.value,
                  }))
                }
                value={draft.technicianId}
              >
                <option value="">Todos</option>
                {(result?.options.technicians ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {partyName(option)}
                  </option>
                ))}
              </select>
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
          className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm shadow-slate-950/5 dark:shadow-black/10"
          aria-label="Lista de atendimentos"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr>
                  <th className={TABLE_HEADER_CLASS}>ID</th>
                  <th className={TABLE_HEADER_CLASS}>Atendimento</th>
                  <th className={TABLE_HEADER_CLASS}>Cliente</th>
                  <th className={TABLE_HEADER_CLASS}>Solicitante</th>
                  <th className={TABLE_HEADER_CLASS}>Técnico</th>
                  <th className={TABLE_HEADER_CLASS}>Status</th>
                  <th className={TABLE_HEADER_CLASS}>SLA</th>
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
                        className="font-extrabold text-app-brand no-underline hover:underline focus-visible:underline"
                        href={`/atendimentos/${ticket.id}`}
                      >
                        #{ticket.id}
                      </Link>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <div className="grid gap-1">
                        <strong className="text-[13px] text-app-text">
                          {ticket.category.name || 'Sem categoria'}
                          {ticket.subcategory.name
                            ? ` · ${ticket.subcategory.name}`
                            : ''}
                        </strong>
                        <span
                          className="max-w-[360px] overflow-hidden text-ellipsis whitespace-nowrap text-app-muted-strong"
                          title={ticketDescription(ticket)}
                        >
                          {ticketDescription(ticket)}
                        </span>
                      </div>
                    </td>
                    <td className={TABLE_CELL_CLASS}>{ticket.client.name || '—'}</td>
                    <td className={TABLE_CELL_CLASS}>{ticket.requester.name || '—'}</td>
                    <td className={TABLE_CELL_CLASS}>
                      {ticket.technician.name || 'Não atribuído'}
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-app-surface-muted px-2 py-1 text-xs font-extrabold text-app-text-soft ring-1 ring-inset ring-app-border-soft">
                        {ticket.statusLabel}
                      </span>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <div className="grid gap-1 whitespace-nowrap">
                        <strong className="flex items-center text-[13px] text-app-text">
                          <SlaIndicator bellOrder={ticket.sla.bellOrder} />
                          {formatDuration(ticket.sla.remainingSeconds)}
                        </strong>
                        <span className="text-[11px] text-app-subtle">
                          Espera {formatDuration(ticket.sla.waitSeconds)}
                        </span>
                      </div>
                    </td>
                    <td className={TABLE_CELL_CLASS}>{formatDate(ticket.openedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && !error && result?.data.length === 0 ? (
            <div className="px-5 py-10 text-center text-app-muted-strong">
              Nenhum atendimento encontrado com os filtros atuais.
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-app-border-soft px-4 py-3.5 max-sm:flex-col max-sm:items-stretch">
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
      </div>
    </main>
  );
}

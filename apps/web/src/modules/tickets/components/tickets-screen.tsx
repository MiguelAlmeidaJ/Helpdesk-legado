"use client";

import type {
  CurrentUserResponse,
  TicketFilterOption,
  TicketListItem,
  TicketListResponse,
  TicketStatusCard,
} from '@helpdesk/contracts';
import Link from 'next/link';
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { ApiError } from '../../../shared/api/api-client';
import {
  fetchTickets,
  type TicketListQuery,
} from '../api/tickets-api';

const DEFAULT_STATUS = '1,2,3,5';

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
    <div className="status-grid" aria-label="Resumo por status">
      {cards.map((card) => {
        const cardStatus = card.statuses.join(',');
        const active = cardStatus === selectedStatus;

        return (
          <button
            className="status-card"
            data-active={active}
            disabled={disabled}
            key={card.key}
            onClick={() => onSelect(card)}
            type="button"
          >
            <span>{card.label}</span>
            <strong>{card.total.toLocaleString('pt-BR')}</strong>
          </button>
        );
      })}
    </div>
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
    <main className="tickets-page">
      <header className="tickets-header">
        <div className="tickets-header-left">
          <AppSidebar />
          <Link className="tickets-brand" href="/dashboard">
            <strong>Helpdesk</strong>
            <span>Nova plataforma</span>
          </Link>
        </div>
        <div className="tickets-header-actions">
          <span className="tickets-total">{totalLabel}</span>
          <SessionUserMenu user={currentUser} />
        </div>
      </header>

      <div className="tickets-content">
        <div className="tickets-title-row">
          <div>
            <span className="eyebrow">Operação</span>
            <h1>Atendimentos</h1>
            <p>
              Consulta inicial migrada para Next.js, consumindo somente a API
              NestJS.
            </p>
          </div>
        </div>

        {result ? (
          <StatusCards
            cards={result.statusCards}
            disabled={loading}
            onSelect={selectStatus}
            selectedStatus={query.status ?? DEFAULT_STATUS}
          />
        ) : null}

        <form className="filters-panel" onSubmit={submitFilters}>
          <div className="filters-grid">
            <div className="field">
              <label htmlFor="ticket-search">Busca</label>
              <input
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

            <div className="field">
              <label htmlFor="ticket-client">Cliente</label>
              <select
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

            <div className="field">
              <label htmlFor="ticket-requester">Solicitante</label>
              <select
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

            <div className="field">
              <label htmlFor="ticket-technician">Técnico</label>
              <select
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

            <div className="field">
              <label htmlFor="ticket-opened-from">Abertura de</label>
              <input
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

            <div className="field">
              <label htmlFor="ticket-opened-to">Abertura até</label>
              <input
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

          <div className="filters-actions">
            <button
              className="button"
              disabled={loading}
              onClick={clearFilters}
              type="button"
            >
              Limpar
            </button>
            <button
              className="button button-primary"
              disabled={loading}
              type="submit"
            >
              Aplicar filtros
            </button>
          </div>
        </form>

        {loading ? <div className="loading-line" aria-label="Carregando" /> : null}
        {error ? <div className="feedback">{error}</div> : null}

        <section className="table-card" aria-label="Lista de atendimentos">
          <div className="table-scroll">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Atendimento</th>
                  <th>Cliente</th>
                  <th>Solicitante</th>
                  <th>Técnico</th>
                  <th>Status</th>
                  <th>SLA</th>
                  <th>Abertura</th>
                </tr>
              </thead>
              <tbody>
                {(result?.data ?? []).map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="ticket-id">
                      <Link
                        className="ticket-id-link"
                        href={`/tickets/${ticket.id}`}
                      >
                        #{ticket.id}
                      </Link>
                    </td>
                    <td>
                      <div className="ticket-main">
                        <strong>
                          {ticket.category.name || 'Sem categoria'}
                          {ticket.subcategory.name
                            ? ` · ${ticket.subcategory.name}`
                            : ''}
                        </strong>
                        <span title={ticketDescription(ticket)}>
                          {ticketDescription(ticket)}
                        </span>
                      </div>
                    </td>
                    <td>{ticket.client.name || '—'}</td>
                    <td>{ticket.requester.name || '—'}</td>
                    <td>{ticket.technician.name || 'Não atribuído'}</td>
                    <td>
                      <span className="status-pill">{ticket.statusLabel}</span>
                    </td>
                    <td>
                      <div className="sla">
                        <strong>
                          {formatDuration(ticket.sla.remainingSeconds)}
                        </strong>
                        <span>
                          Espera {formatDuration(ticket.sla.waitSeconds)}
                        </span>
                      </div>
                    </td>
                    <td>{formatDate(ticket.openedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && !error && result?.data.length === 0 ? (
            <div className="empty-state">
              Nenhum atendimento encontrado com os filtros atuais.
            </div>
          ) : null}

          <div className="pagination">
            <span className="pagination-info">
              Página {currentPage}
              {totalPages > 0 ? ` de ${totalPages}` : ''}
            </span>

            <div className="pagination-actions">
              <button
                className="button"
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
                className="button"
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

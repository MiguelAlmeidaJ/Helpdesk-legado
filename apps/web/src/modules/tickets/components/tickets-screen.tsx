"use client";

import {
  AppPermission,
  PermissionScope,
  UserRole,
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
  useRef,
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
const SEARCH_DEBOUNCE_MS = 400;

const DEFAULT_QUERY: TicketListQuery = {
  page: 1,
  limit: 50,
  status: DEFAULT_STATUS,
  sort: 'sla',
  direction: 'asc',
};

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

function defaultDraft(currentUser: CurrentUserResponse): FilterDraft {
  const isTechnician = currentUser.roleAssignments.some(
    (assignment) => assignment.role === UserRole.Technician,
  ) || currentUser.grants.some(
    (grant) =>
      grant.permission === AppPermission.TicketsExecute &&
      grant.scope === PermissionScope.Own,
  );

  return {
    ...EMPTY_DRAFT,
    technicianIds: isTechnician ? [String(currentUser.id)] : [],
  };
}

function defaultFilters(currentUser: CurrentUserResponse): StoredTicketFilters {
  const draft = defaultDraft(currentUser);
  return {
    draft,
    query: buildQuery(draft, DEFAULT_QUERY),
  };
}

interface StoredTicketFilters {
  query: TicketListQuery;
  draft: FilterDraft;
}

function filterStorageKey(userId: number): string {
  return `helpdesk:tickets:filters:v3:${userId}`;
}

function appendTicketPage(
  current: TicketListResponse | null,
  response: TicketListResponse,
): TicketListResponse {
  if (!current || response.meta.page <= 1) return response;

  const knownIds = new Set(current.data.map((ticket) => ticket.id));
  return {
    ...response,
    data: [
      ...current.data,
      ...response.data.filter((ticket) => !knownIds.has(ticket.id)),
    ],
  };
}

function refreshVisibleTickets(
  current: TicketListResponse | null,
  response: TicketListResponse,
): TicketListResponse {
  if (!current || current.meta.page <= 1) return response;

  const refreshed = new Map(response.data.map((ticket) => [ticket.id, ticket]));
  return {
    ...current,
    filters: response.filters,
    options: response.options,
    statusCards: response.statusCards,
    meta: {
      ...current.meta,
      total: response.meta.total,
      totalPages: response.meta.totalPages,
    },
    data: current.data.map((ticket) => refreshed.get(ticket.id) ?? ticket),
  };
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function restoreFilters(userId: number): StoredTicketFilters | null {
  try {
    const value = window.sessionStorage.getItem(filterStorageKey(userId));
    if (!value) return null;

    const stored = JSON.parse(value) as Partial<StoredTicketFilters>;
    const query = stored.query;
    const draft = stored.draft;

    if (
      !query ||
      !Number.isSafeInteger(query.page) ||
      query.page < 1 ||
      !draft ||
      !isString(draft.search) ||
      !isString(draft.clientId) ||
      !Array.isArray(draft.technicianIds) ||
      !draft.technicianIds.every(isString) ||
      !isString(draft.openedFrom) ||
      !isString(draft.openedTo)
    ) {
      return null;
    }

    return {
      query: { ...DEFAULT_QUERY, ...query },
      draft,
    };
  } catch {
    return null;
  }
}

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

function formatFilterDate(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

const CALENDAR_WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const CALENDAR_MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});
const CALENDAR_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
});

function parseFilterDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function filterDateValue(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function firstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function calendarDays(month: Date): Date[] {
  const first = firstDayOfMonth(month);
  const daysBeforeMonday = (first.getDay() + 6) % 7;
  const gridStart = new Date(
    first.getFullYear(),
    first.getMonth(),
    first.getDate() - daysBeforeMonday,
  );

  return Array.from(
    { length: 42 },
    (_, index) =>
      new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index,
      ),
  );
}

function DateRangeField({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    firstDayOfMonth(new Date()),
  );
  const [selectedFrom, setSelectedFrom] = useState('');
  const [selectedTo, setSelectedTo] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', closeWithEscape);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', closeWithEscape);
    };
  }, []);

  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);
  const selectedStartDate = parseFilterDate(selectedFrom);
  const selectedEndDate = parseFilterDate(selectedTo);

  function toggleCalendar() {
    if (!open) {
      const initialDate = parseFilterDate(from) ?? parseFilterDate(to) ?? new Date();
      setVisibleMonth(firstDayOfMonth(initialDate));
      setSelectedFrom(from);
      setSelectedTo(to);
    }
    setOpen((current) => !current);
  }

  function moveMonth(offset: number) {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  function selectDate(date: Date) {
    const value = filterDateValue(date);

    if (!selectedFrom || selectedTo) {
      setSelectedFrom(value);
      setSelectedTo('');
      return;
    }

    const start = parseFilterDate(selectedFrom);
    if (start && date.getTime() < start.getTime()) {
      setSelectedFrom(value);
      setSelectedTo(selectedFrom);
      return;
    }

    setSelectedTo(value);
  }

  const summary =
    from && to
      ? `${formatFilterDate(from)} até ${formatFilterDate(to)}`
      : from
        ? `A partir de ${formatFilterDate(from)}`
        : to
          ? `Até ${formatFilterDate(to)}`
          : 'Qualquer data';

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`${FIELD_CONTROL_CLASS} flex items-center justify-between gap-2 text-left`}
        id="ticket-opened-range"
        onClick={toggleCalendar}
        type="button"
      >
        <span
          className={`truncate ${from || to ? 'text-app-text' : 'text-app-muted'}`}
        >
          {summary}
        </span>
        <svg
          aria-hidden="true"
          className={`size-4 shrink-0 text-app-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="m7 9 5 5 5-5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </button>

      {open ? (
        <div
          aria-label="Período de abertura"
          className="absolute right-0 top-full z-50 mt-1.5 grid w-[22rem] max-w-[calc(100vw-2rem)] gap-3 rounded-xl border border-app-border bg-app-surface p-3 shadow-[0_16px_40px_rgba(15,23,42,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.36)]"
          role="dialog"
        >
          <div className="flex items-center justify-between gap-3">
            <button
              aria-label="Mês anterior"
              className="grid size-9 place-items-center rounded-lg border border-app-border text-lg text-app-muted transition hover:border-app-brand hover:text-app-brand"
              onClick={() => moveMonth(-1)}
              type="button"
            >
              ‹
            </button>
            <strong className="text-sm capitalize text-app-text">
              {CALENDAR_MONTH_FORMATTER.format(visibleMonth)}
            </strong>
            <button
              aria-label="Próximo mês"
              className="grid size-9 place-items-center rounded-lg border border-app-border text-lg text-app-muted transition hover:border-app-brand hover:text-app-brand"
              onClick={() => moveMonth(1)}
              type="button"
            >
              ›
            </button>
          </div>

          <p className="m-0 text-center text-xs text-app-muted">
            {selectedFrom && !selectedTo
              ? 'Agora selecione a data final.'
              : 'Selecione a data inicial e depois a final.'}
          </p>

          <div className="grid grid-cols-7 text-center" aria-hidden="true">
            {CALENDAR_WEEKDAYS.map((weekday) => (
              <span
                className="py-1 text-[10px] font-extrabold uppercase text-app-subtle"
                key={weekday}
              >
                {weekday}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {days.map((date) => {
              const value = filterDateValue(date);
              const timestamp = date.getTime();
              const endpoint = value === selectedFrom || value === selectedTo;
              const inRange = Boolean(
                selectedStartDate &&
                  selectedEndDate &&
                  timestamp >= selectedStartDate.getTime() &&
                  timestamp <= selectedEndDate.getTime(),
              );
              const inVisibleMonth = date.getMonth() === visibleMonth.getMonth();

              return (
                <button
                  aria-label={`Selecionar ${CALENDAR_DATE_FORMATTER.format(date)}`}
                  aria-pressed={endpoint}
                  className={`mx-auto grid size-9 place-items-center rounded-lg text-xs font-bold transition ${
                    endpoint
                      ? 'bg-app-brand text-app-brand-contrast'
                      : inRange
                        ? 'bg-app-brand-soft text-app-brand'
                        : 'text-app-text hover:bg-app-surface-hover'
                  } ${inVisibleMonth ? '' : 'opacity-35'}`}
                  key={value}
                  onClick={() => selectDate(date)}
                  type="button"
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 border-t border-app-border-soft pt-3">
            {selectedFrom || selectedTo || from || to ? (
              <button
                className={BUTTON_CLASS}
                onClick={() => {
                  setSelectedFrom('');
                  setSelectedTo('');
                  onChange({ from: '', to: '' });
                }}
                type="button"
              >
                Limpar
              </button>
            ) : null}
            <button
              className={PRIMARY_BUTTON_CLASS}
              disabled={!selectedFrom || !selectedTo}
              onClick={() => {
                onChange({ from: selectedFrom, to: selectedTo });
                setOpen(false);
              }}
              type="button"
            >
              Concluir
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TicketsScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [query, setQuery] = useState<TicketListQuery>(DEFAULT_QUERY);
  const [draft, setDraft] = useState<FilterDraft>(EMPTY_DRAFT);
  const [result, setResult] = useState<TicketListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersReady, setFiltersReady] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = restoreFilters(currentUser.id);
    const initial = stored ?? defaultFilters(currentUser);
    setQuery(initial.query);
    setDraft(initial.draft);
    setFiltersReady(true);
  }, [currentUser]);

  useEffect(() => {
    if (!filtersReady) return;

    try {
      window.sessionStorage.setItem(
        filterStorageKey(currentUser.id),
        JSON.stringify({
          query: { ...query, page: 1 },
          draft,
        } satisfies StoredTicketFilters),
      );
    } catch {
      // A pesquisa continua funcional quando o navegador bloqueia o storage.
    }
  }, [currentUser.id, draft, filtersReady, query]);

  useEffect(() => {
    if (!filtersReady) return;

    const timeout = window.setTimeout(() => {
      const search = draft.search.trim() || undefined;
      setQuery((current) => {
        if (current.search === search) return current;
        return { ...current, page: 1, search };
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [draft.search, filtersReady]);

  useEffect(() => {
    if (!filtersReady) return;

    const controller = new AbortController();

    const firstPage = query.page <= 1;
    if (firstPage) {
      setLoading(true);
      setLoadingMore(false);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    fetchTickets(query, controller.signal)
      .then((response) => {
        setResult((current) => appendTicketPage(current, response));
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === 'AbortError') {
          return;
        }

        setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          if (firstPage) setLoading(false);
          else setLoadingMore(false);
        }
      });

    return () => controller.abort();
  }, [filtersReady, query]);

  useEffect(() => {
    if (!filtersReady) return;

    const interval = window.setInterval(() => {
      void fetchTickets({ ...query, page: 1 })
        .then((response) => {
          setResult((current) => refreshVisibleTickets(current, response));
        })
        .catch(() => {
          // O refresh silencioso não substitui a última lista válida.
        });
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [filtersReady, query]);

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
    const initial = defaultFilters(currentUser);
    setDraft(initial.draft);
    setQuery(initial.query);
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
      const response = await fetchTickets({ ...query, page: 1 });
      setResult((current) => refreshVisibleTickets(current, response));
    } catch {
      // A ação já foi concluída; o próximo refresh automático tenta novamente.
    }
  }

  const meta = result?.meta;
  const currentPage = query.page;
  const totalPages = meta?.totalPages ?? 0;
  const hasMore = totalPages > 0 && currentPage < totalPages;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!filtersReady || !target || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setLoadingMore(true);
        setQuery((current) => ({ ...current, page: current.page + 1 }));
      },
      { rootMargin: '280px 0px' },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [filtersReady, hasMore, loading, loadingMore]);

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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                placeholder="Código, solicitante ou descrição"
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
              <FieldLabel htmlFor="ticket-opened-range">Abertura</FieldLabel>
              <DateRangeField
                from={draft.openedFrom}
                onChange={({ from, to }) =>
                  setDraft((current) => ({
                    ...current,
                    openedFrom: from,
                    openedTo: to,
                  }))
                }
                to={draft.openedTo}
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
                    ? 'ticket-sla-breached'
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

          <div
            className="mt-3 flex min-h-16 items-center justify-center border-t border-app-border-soft px-3 pt-3.5 text-center"
            ref={loadMoreRef}
          >
            {loadingMore ? (
              <div
                aria-live="polite"
                className="flex items-center gap-2 text-[13px] font-semibold text-app-muted"
              >
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-app-border-strong border-t-app-brand"
                />
                Carregando mais atendimentos…
              </div>
            ) : hasMore ? (
              <button
                className={BUTTON_CLASS}
                onClick={() =>
                  setQuery((current) => ({ ...current, page: current.page + 1 }))
                }
                type="button"
              >
                Carregar mais
              </button>
            ) : result && result.data.length > 0 ? (
              <span className="text-[13px] text-app-muted-strong">
                {result.data.length.toLocaleString('pt-BR')} de{' '}
                {result.meta.total.toLocaleString('pt-BR')} atendimentos carregados
              </span>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import {
  AppPermission,
  type CurrentUserResponse,
  type TechnicianAvailabilityItem,
  type TechnicianAvailabilityState,
  type TicketAvailabilityResponse,
  type TicketAvailabilityTicket,
} from '@helpdesk/contracts';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { fetchTicketAvailability } from '../api/tickets-api';

type TechnicianFilter = 'all' | TechnicianAvailabilityState;
type ViewMode = 'technicians' | 'tickets';
type QueueKey = 'hold' | 'finished' | 'inProgress' | 'waiting' | 'scheduled';

const BUTTON =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-app-brand bg-app-brand px-4 text-sm font-bold text-white no-underline transition hover:bg-app-brand-hover disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-950';
const INPUT =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)]';

const technicianStateClass: Record<TechnicianAvailabilityState, string> = {
  available:
    'border-emerald-300/80 bg-emerald-50/55 dark:border-emerald-900/70 dark:bg-emerald-950/15',
  busy:
    'border-amber-300/80 bg-amber-50/55 dark:border-amber-900/70 dark:bg-amber-950/15',
  offline:
    'border-app-border bg-app-surface-muted/80',
};

const technicianStateBadge: Record<TechnicianAvailabilityState, string> = {
  available:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200',
  busy:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200',
  offline:
    'bg-app-surface-hover text-app-muted',
};

const technicianStateLabel: Record<TechnicianAvailabilityState, string> = {
  available: 'Disponível',
  busy: 'Ocupado',
  offline: 'Offline',
};

const technicianStateOrder: Record<TechnicianAvailabilityState, number> = {
  available: 0,
  busy: 1,
  offline: 2,
};

function canAudit(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.TicketsAudit,
  );
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date);
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function TicketChip({
  ticket,
}: {
  ticket: TicketAvailabilityTicket;
}) {
  return (
    <Link
      className="inline-flex min-h-7 items-center rounded-md bg-app-brand-soft px-2 text-[10px] font-black text-app-brand no-underline transition hover:bg-app-surface-hover"
      href={`/atendimentos/${ticket.id}`}
      title={`#${ticket.id} · ${ticket.clientName ?? 'Cliente não informado'} · ${ticket.typeLabel}`}
    >
      #{ticket.id}
    </Link>
  );
}

function TechnicianCard({
  item,
}: {
  item: TechnicianAvailabilityItem;
}) {
  const visibleTickets = item.executing.slice(0, 6);
  const hiddenTickets = Math.max(0, item.executing.length - visibleTickets.length);

  return (
    <article
      className={`min-h-[132px] rounded-xl border p-3.5 transition ${technicianStateClass[item.state]}`}
      data-state={item.state}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block truncate text-[13px] font-black text-app-text">
            {item.name}
          </strong>
          <span className="mt-0.5 block text-[10px] font-semibold text-app-subtle">
            Função {item.functionId}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.03em] ${technicianStateBadge[item.state]}`}
        >
          {technicianStateLabel[item.state]}
        </span>
      </div>

      {item.state === 'busy' ? (
        <>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-app-muted">
              Em execução
            </span>
            <strong className="text-[11px] font-black text-app-text">
              {item.executing.length}
            </strong>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {visibleTickets.map((ticket) => (
              <TicketChip key={ticket.id} ticket={ticket} />
            ))}
            {hiddenTickets > 0 ? (
              <span
                className="inline-flex min-h-7 items-center rounded-md bg-app-surface px-2 text-[10px] font-black text-app-muted ring-1 ring-inset ring-app-border"
                title={`Mais ${hiddenTickets} atendimento(s) em execução`}
              >
                +{hiddenTickets}
              </span>
            ) : null}
          </div>
        </>
      ) : item.state === 'available' ? (
        <div className="mt-5 flex items-center gap-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
          <span className="size-2.5 rounded-full bg-emerald-500" />
          Livre para atendimento
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-2 text-[10px] text-app-subtle">
          <span className="size-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
          Sem atividade nos últimos 10 min
        </div>
      )}
    </article>
  );
}

function SummaryCard({
  label,
  value,
  subtitle,
  icon,
  tone = 'default',
}: {
  label: string;
  value: number;
  subtitle: string;
  icon: string;
  tone?: 'default' | 'green' | 'amber' | 'blue' | 'red';
}) {
  const toneClass = {
    default: 'border-app-border text-app-text',
    green: 'border-emerald-200 text-emerald-600 dark:border-emerald-900/70 dark:text-emerald-400',
    amber: 'border-amber-200 text-amber-600 dark:border-amber-900/70 dark:text-amber-400',
    blue: 'border-blue-200 text-app-brand dark:border-blue-900/70',
    red: 'border-red-200 text-red-600 dark:border-red-900/70 dark:text-red-400',
  }[tone];

  return (
    <div className="flex min-h-[82px] items-center gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3 shadow-sm">
      <span
        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg border text-[17px] ${toneClass}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <span className="block truncate text-[9px] font-black uppercase tracking-[0.05em] text-app-subtle">
          {label}
        </span>
        <strong className="mt-0.5 block text-[23px] font-black leading-none text-app-text">
          {value}
        </strong>
        <small className="mt-1 block truncate text-[9px] text-app-muted">
          {subtitle}
        </small>
      </div>
    </div>
  );
}

function QueueTable({
  tickets,
  empty,
}: {
  tickets: TicketAvailabilityTicket[];
  empty: string;
}) {
  if (!tickets.length) {
    return (
      <div className="px-4 py-10 text-center text-sm text-app-muted">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead className="bg-app-surface-muted">
          <tr>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.04em] text-app-muted">
              ID
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.04em] text-app-muted">
              Cliente
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.04em] text-app-muted">
              Tipo
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.04em] text-app-muted">
              Técnico
            </th>
            <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.04em] text-app-muted">
              Abertura
            </th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr
              className="border-t border-app-border-soft transition hover:bg-app-surface-muted"
              key={ticket.id}
            >
              <td className="px-4 py-3">
                <Link
                  className="text-xs font-black text-app-brand no-underline hover:underline"
                  href={`/atendimentos/${ticket.id}`}
                >
                  #{ticket.id}
                </Link>
              </td>
              <td className="max-w-[260px] px-4 py-3 text-xs font-semibold text-app-text">
                <span className="block truncate">
                  {ticket.clientName ?? 'Cliente não informado'}
                </span>
              </td>
              <td className="max-w-[220px] px-4 py-3 text-xs text-app-muted-strong">
                <span className="block truncate">{ticket.typeLabel}</span>
              </td>
              <td className="max-w-[220px] px-4 py-3 text-xs text-app-muted-strong">
                <span className="block truncate">
                  {ticket.technicianName ?? 'Não atribuído'}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-[11px] text-app-subtle">
                {formatDate(ticket.openedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HoldsTable({
  groups,
}: {
  groups: TicketAvailabilityResponse['holds'];
}) {
  if (!groups.length) {
    return (
      <div className="px-4 py-10 text-center text-sm text-app-muted">
        Nenhum atendimento em espera.
      </div>
    );
  }

  return (
    <div className="grid gap-2 p-3">
      {groups.map((group) => {
        const byTechnician = new Map<string, TicketAvailabilityTicket[]>();
        for (const ticket of group.tickets) {
          const name = ticket.technicianName?.trim() || 'Sem técnico';
          const current = byTechnician.get(name) ?? [];
          current.push(ticket);
          byTechnician.set(name, current);
        }

        return (
          <details
            className="overflow-hidden rounded-xl border border-amber-300/80 bg-amber-50/25 open:bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/10"
            key={group.cause}
            open
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-black text-app-text">
              <span>{group.cause}</span>
              <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[9px] text-white">
                {group.tickets.length} atendimento{group.tickets.length === 1 ? '' : 's'}
              </span>
            </summary>

            <div className="border-t border-amber-200/70 p-2 dark:border-amber-900/50">
              {[...byTechnician.entries()]
                .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
                .map(([technician, tickets]) => (
                  <details
                    className="mb-1 overflow-hidden rounded-lg border border-amber-200/80 bg-app-surface last:mb-0 dark:border-amber-900/50"
                    key={technician}
                    open={tickets.length <= 4}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-[11px] font-black">
                      <span>{technician}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        {tickets.length} chamado{tickets.length === 1 ? '' : 's'}
                      </span>
                    </summary>
                    <div className="divide-y divide-app-border-soft border-t border-app-border-soft px-3">
                      {tickets.map((ticket) => (
                        <Link
                          className="grid gap-2 py-2.5 text-app-text no-underline transition hover:bg-app-surface-muted lg:grid-cols-[80px_120px_minmax(0,1fr)_170px]"
                          href={`/atendimentos/${ticket.id}`}
                          key={ticket.id}
                        >
                          <strong className="text-[11px] text-app-brand">
                            #{ticket.id}
                          </strong>
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            {ticket.waitingCount}x em espera
                          </span>
                          <span className="min-w-0 truncate text-[10px] text-app-muted">
                            {ticket.holdDescription?.trim() || ticket.clientName || 'Sem descrição'}
                          </span>
                          <span className="text-[9px] text-app-subtle lg:text-right">
                            Previsão: {formatDate(ticket.holdForecastAt)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </details>
                ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function TicketAvailabilityScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const allowed = canAudit(currentUser);
  const [data, setData] = useState<TicketAvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(allowed);
  const [error, setError] = useState<string | null>(null);
  const [technicianFilter, setTechnicianFilter] =
    useState<TechnicianFilter>('all');
  const [technicianSearch, setTechnicianSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('tickets');
  const [queue, setQueue] = useState<QueueKey>('hold');
  const [ticketTechnician, setTicketTechnician] = useState('all');

  const load = useCallback(async () => {
    if (!allowed) return;

    try {
      setError(null);
      setData(await fetchTicketAvailability());
    } catch (reason: unknown) {
      setError(
        reason instanceof ApiError && reason.status === 403
          ? 'Seu usuário não possui acesso à Disponibilidade Técnica.'
          : 'Não foi possível carregar a Disponibilidade Técnica.',
      );
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    void load();
    if (!allowed) return;

    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [allowed, load]);

  const technicians = useMemo(() => {
    if (!data) return [];

    const search = technicianSearch.trim().toLocaleLowerCase('pt-BR');

    return [...data.technicians]
      .filter(
        (item) =>
          technicianFilter === 'all' || item.state === technicianFilter,
      )
      .filter(
        (item) =>
          !search ||
          item.name.toLocaleLowerCase('pt-BR').includes(search) ||
          item.executing.some(
            (ticket) =>
              String(ticket.id).includes(search) ||
              (ticket.clientName ?? '')
                .toLocaleLowerCase('pt-BR')
                .includes(search),
          ),
      )
      .sort(
        (left, right) =>
          technicianStateOrder[left.state] -
            technicianStateOrder[right.state] ||
          left.name.localeCompare(right.name, 'pt-BR'),
      );
  }, [data, technicianFilter, technicianSearch]);

  const totalTechnicians = data?.technicians.length ?? 0;
  const offlineTechnicians =
    totalTechnicians - (data?.summary.onlineTechnicians ?? 0);

  const inProgressTickets = useMemo(
    () =>
      data?.technicians.flatMap((item) => item.executing) ?? [],
    [data],
  );

  const filterByTechnician = useCallback(
    (tickets: TicketAvailabilityTicket[]) => {
      if (ticketTechnician === 'all') return tickets;
      const technicianId = Number(ticketTechnician);
      return tickets.filter((ticket) => ticket.technicianId === technicianId);
    },
    [ticketTechnician],
  );

  const filteredHoldGroups = useMemo(() => {
    if (!data) return [];
    if (ticketTechnician === 'all') return data.holds;
    const technicianId = Number(ticketTechnician);
    return data.holds
      .map((group) => ({
        ...group,
        tickets: group.tickets.filter(
          (ticket) => ticket.technicianId === technicianId,
        ),
      }))
      .filter((group) => group.tickets.length > 0);
  }, [data, ticketTechnician]);

  const queueTabs = data
    ? [
        {
          key: 'hold' as const,
          label: 'Em espera',
          count: data.summary.onHold,
        },
        {
          key: 'finished' as const,
          label: 'Concluídos',
          count: data.summary.finishedToday,
        },
        {
          key: 'inProgress' as const,
          label: 'Em execução',
          count: data.summary.inProgress,
        },
        {
          key: 'waiting' as const,
          label: 'Na fila',
          count: data.summary.waitingExecution,
        },
        {
          key: 'scheduled' as const,
          label: 'Agendados',
          count: data.summary.scheduled,
        },
      ]
    : [];

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          <div className="flex items-center gap-2">
            <Link
              className={PRIMARY}
              href="/atendimentos/disponibilidade/antiga"
            >
              Ver Disponibilidade Antiga
            </Link>
            <button
              className={BUTTON}
              disabled={!allowed || loading}
              onClick={() => void load()}
              type="button"
            >
              {loading ? 'Atualizando…' : 'Atualizar'}
            </button>
          </div>
        }
        meta={
          data ? (
            <span className="text-[11px] text-app-muted max-lg:hidden">
              Atualizado às {formatUpdatedAt(data.generatedAt)}
            </span>
          ) : undefined
        }
        subtitle="Visão operacional dos atendimentos em tempo real."
        title="Disponibilidade Técnica"
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1500px] px-6 py-5 max-sm:px-3.5">
        {!allowed ? (
          <div className="mb-4 rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm text-app-muted">
            Seu usuário não possui a permissão de auditoria de atendimentos.
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger">
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="rounded-xl border border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
            Carregando disponibilidade…
          </div>
        ) : null}

        {data ? (
          <>
            <section className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryCard
                icon="👍"
                label="Técnicos online livres"
                subtitle="Equipe disponível agora"
                tone="green"
                value={data.summary.availableTechnicians}
              />
              <SummaryCard
                icon="👎"
                label="Técnicos ocupados"
                subtitle="Em atendimento"
                tone="red"
                value={data.summary.busyTechnicians}
              />
              <SummaryCard
                icon="⏸"
                label="Em espera"
                subtitle="Aguardando retorno"
                tone="amber"
                value={data.summary.onHold}
              />
              <SummaryCard
                icon="🔔"
                label="Na fila"
                subtitle="Aguardando distribuição"
                tone="red"
                value={data.summary.waitingExecution}
              />
              <SummaryCard
                icon="☑"
                label="Concluídos hoje"
                subtitle="Finalizados no dia"
                tone="blue"
                value={data.summary.finishedToday}
              />
            </section>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-xl bg-app-surface-muted p-1">
                <button
                  className={[
                    'min-h-9 rounded-lg px-4 text-xs font-black transition',
                    viewMode === 'technicians'
                      ? 'bg-app-brand text-white shadow-sm dark:text-slate-950'
                      : 'text-app-muted hover:text-app-text',
                  ].join(' ')}
                  onClick={() => setViewMode('technicians')}
                  type="button"
                >
                  👥 Técnicos
                </button>
                <button
                  className={[
                    'min-h-9 rounded-lg px-4 text-xs font-black transition',
                    viewMode === 'tickets'
                      ? 'bg-app-brand text-white shadow-sm dark:text-slate-950'
                      : 'text-app-muted hover:text-app-text',
                  ].join(' ')}
                  onClick={() => setViewMode('tickets')}
                  type="button"
                >
                  ☷ Atendimentos
                </button>
              </div>

              <span className="text-[10px] text-app-muted">
                {data.summary.onlineTechnicians} online · atualização automática a cada 30s
              </span>
            </div>

            {viewMode === 'technicians' ? (
              <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft px-4 py-3">
                  <div>
                    <h2 className="m-0 text-[15px] font-black text-app-text">
                      Técnicos
                    </h2>
                    <p className="m-0 mt-1 text-[10px] text-app-muted">
                      Presença considera os últimos {data.onlineWindowMinutes} minutos.
                    </p>
                  </div>

                  <div className="flex min-w-0 flex-1 items-center justify-end gap-2 max-lg:basis-full max-lg:justify-start">
                    <div className="flex flex-wrap gap-1 rounded-lg bg-app-surface-muted p-1">
                      {([
                        ['all', 'Todos', totalTechnicians],
                        ['available', 'Disponíveis', data.summary.availableTechnicians],
                        ['busy', 'Ocupados', data.summary.busyTechnicians],
                        ['offline', 'Offline', offlineTechnicians],
                      ] as const).map(([key, label, count]) => (
                        <button
                          className={[
                            'min-h-8 rounded-md px-2.5 text-[10px] font-black transition',
                            technicianFilter === key
                              ? 'bg-app-surface text-app-brand shadow-sm ring-1 ring-app-border'
                              : 'text-app-muted hover:text-app-text',
                          ].join(' ')}
                          key={key}
                          onClick={() => setTechnicianFilter(key)}
                          type="button"
                        >
                          {label} · {count}
                        </button>
                      ))}
                    </div>

                    <input
                      className={`${INPUT} max-w-[260px]`}
                      onChange={(event) => setTechnicianSearch(event.target.value)}
                      placeholder="Buscar técnico ou chamado"
                      type="search"
                      value={technicianSearch}
                    />
                  </div>
                </div>

                <div className="grid gap-2.5 p-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                  {technicians.map((item) => (
                    <TechnicianCard item={item} key={item.id} />
                  ))}
                  {!technicians.length ? (
                    <div className="col-span-full rounded-xl bg-app-surface-muted px-4 py-8 text-center text-sm text-app-muted">
                      Nenhum técnico encontrado com os filtros atuais.
                    </div>
                  ) : null}
                </div>
              </section>
            ) : (
              <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
                <div className="flex flex-wrap items-center gap-2 border-b border-app-border-soft bg-app-surface-muted/40 px-3 py-3">
                  {queueTabs.map((tab) => (
                    <button
                      className={[
                        'min-h-9 rounded-lg border px-4 text-[11px] font-black transition',
                        queue === tab.key
                          ? 'border-app-brand bg-app-brand text-white shadow-sm dark:text-slate-950'
                          : 'border-app-border bg-app-surface text-app-text-soft hover:bg-app-surface-hover',
                      ].join(' ')}
                      key={tab.key}
                      onClick={() => setQueue(tab.key)}
                      type="button"
                    >
                      {tab.label}
                      <span className="ml-1.5">{tab.count}</span>
                    </button>
                  ))}

                  <select
                    className={`${INPUT} ml-auto max-w-[250px] max-lg:ml-0`}
                    onChange={(event) => setTicketTechnician(event.target.value)}
                    value={ticketTechnician}
                  >
                    <option value="all">👤 Todos os técnicos</option>
                    {data.technicians.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <Link
                    className={BUTTON}
                    href="/atendimentos/disponibilidade/relatorio-espera"
                  >
                    Criar relatório em espera
                  </Link>
                </div>

                <div className="flex items-center justify-between border-b border-app-border-soft px-4 py-3">
                  <h2 className="m-0 text-[14px] font-black text-app-text">
                    {queue === 'hold'
                      ? `Atendimentos Em Espera: ${filterByTechnician(data.holds.flatMap((group) => group.tickets)).length}`
                      : queue === 'finished'
                        ? `Atendimentos Concluídos Hoje: ${filterByTechnician(data.finishedToday).length}`
                        : queue === 'inProgress'
                          ? `Atendimentos Em Execução: ${filterByTechnician(inProgressTickets).length}`
                          : queue === 'waiting'
                            ? `Atendimentos na fila: ${filterByTechnician(data.waitingExecution).length}`
                            : `Atendimentos Agendados: ${filterByTechnician(data.scheduled).length}`}
                  </h2>
                </div>

                {queue === 'hold' ? (
                  <HoldsTable groups={filteredHoldGroups} />
                ) : null}
                {queue === 'finished' ? (
                  <QueueTable
                    empty="Nenhum atendimento concluído hoje."
                    tickets={filterByTechnician(data.finishedToday)}
                  />
                ) : null}
                {queue === 'inProgress' ? (
                  <QueueTable
                    empty="Nenhum atendimento em execução."
                    tickets={filterByTechnician(inProgressTickets)}
                  />
                ) : null}
                {queue === 'waiting' ? (
                  <QueueTable
                    empty="Nenhum atendimento aguardando distribuição."
                    tickets={filterByTechnician(data.waitingExecution)}
                  />
                ) : null}
                {queue === 'scheduled' ? (
                  <QueueTable
                    empty="Nenhum atendimento agendado."
                    tickets={filterByTechnician(data.scheduled)}
                  />
                ) : null}
              </section>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}

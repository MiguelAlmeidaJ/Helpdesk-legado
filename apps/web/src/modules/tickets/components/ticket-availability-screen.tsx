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
type QueueKey = 'waiting' | 'scheduled' | 'hold' | 'finished';

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
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'green' | 'amber' | 'blue';
}) {
  const toneClass = {
    default: 'text-app-text',
    green: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-app-brand',
  }[tone];

  return (
    <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3 shadow-sm">
      <span className="block text-[9px] font-black uppercase tracking-[0.05em] text-app-subtle">
        {label}
      </span>
      <strong className={`mt-1 block text-[23px] font-black leading-none ${toneClass}`}>
        {value}
      </strong>
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
  const tickets = groups.flatMap((group) =>
    group.tickets.map((ticket) => ({
      ...ticket,
      groupCause: group.cause,
    })),
  );

  if (!tickets.length) {
    return (
      <div className="px-4 py-10 text-center text-sm text-app-muted">
        Nenhum atendimento em espera.
      </div>
    );
  }

  return (
    <div className="grid gap-2 p-3">
      {tickets.map((ticket) => (
        <Link
          className="grid gap-2 rounded-xl border border-app-border bg-app-surface-muted p-3 text-app-text no-underline transition hover:bg-app-surface-hover lg:grid-cols-[80px_minmax(180px,1fr)_160px_110px_170px]"
          href={`/atendimentos/${ticket.id}`}
          key={ticket.id}
        >
          <strong className="text-xs font-black text-app-brand">
            #{ticket.id}
          </strong>
          <div className="min-w-0">
            <strong className="block truncate text-xs">
              {ticket.clientName ?? 'Cliente não informado'}
            </strong>
            <span className="mt-1 block truncate text-[10px] text-app-muted">
              {ticket.groupCause}
            </span>
          </div>
          <span className="truncate text-[11px] text-app-muted-strong">
            {ticket.technicianName ?? 'Sem técnico'}
          </span>
          <span className="text-[11px] font-bold text-app-text-soft">
            {ticket.waitingCount}x em espera
          </span>
          <span className="text-[10px] text-app-subtle lg:text-right">
            Previsão: {formatDate(ticket.holdForecastAt)}
          </span>
          {ticket.holdDescription?.trim() ? (
            <p className="m-0 text-[10px] leading-5 text-app-muted lg:col-start-2 lg:col-end-6">
              {ticket.holdDescription.trim()}
            </p>
          ) : null}
        </Link>
      ))}
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
  const [queue, setQueue] = useState<QueueKey>('waiting');

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

  const queueTabs = data
    ? [
        {
          key: 'waiting' as const,
          label: 'Aguardando',
          count: data.summary.waitingExecution,
        },
        {
          key: 'scheduled' as const,
          label: 'Agendados',
          count: data.summary.scheduled,
        },
        {
          key: 'hold' as const,
          label: 'Em espera',
          count: data.summary.onHold,
        },
        {
          key: 'finished' as const,
          label: 'Finalizados hoje',
          count: data.summary.finishedToday,
        },
      ]
    : [];

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          <div className="flex items-center gap-2">
            {allowed ? (
              <Link
                className={BUTTON}
                href="/atendimentos/disponibilidade/relatorio-espera"
              >
                Relatório de esperas
              </Link>
            ) : null}
            <button
              className={PRIMARY}
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
        subtitle="Visão operacional da equipe e das filas de atendimento."
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
            <section className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-8">
              <SummaryCard label="Aguardando" value={data.summary.waitingExecution} />
              <SummaryCard label="Em execução" value={data.summary.inProgress} tone="amber" />
              <SummaryCard label="Em espera" value={data.summary.onHold} />
              <SummaryCard label="Agendados" value={data.summary.scheduled} />
              <SummaryCard label="Finalizados hoje" value={data.summary.finishedToday} />
              <SummaryCard label="Online" value={data.summary.onlineTechnicians} tone="blue" />
              <SummaryCard label="Disponíveis" value={data.summary.availableTechnicians} tone="green" />
              <SummaryCard label="Ocupados" value={data.summary.busyTechnicians} tone="amber" />
            </section>

            <section className="mb-4 overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft px-4 py-3">
                <div>
                  <h2 className="m-0 text-[15px] font-black text-app-text">
                    Equipe técnica
                  </h2>
                  <p className="m-0 mt-1 text-[10px] text-app-muted">
                    {data.summary.onlineTechnicians} online · {offlineTechnicians} offline · presença considera os últimos {data.onlineWindowMinutes} min
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
                    className={`${INPUT} max-w-[250px]`}
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

            <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft px-4 py-3">
                <div>
                  <h2 className="m-0 text-[15px] font-black text-app-text">
                    Filas operacionais
                  </h2>
                  <p className="m-0 mt-1 text-[10px] text-app-muted">
                    Acompanhe os atendimentos que exigem ação ou acompanhamento.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 rounded-lg bg-app-surface-muted p-1">
                  {queueTabs.map((tab) => (
                    <button
                      className={[
                        'min-h-8 rounded-md px-3 text-[10px] font-black transition',
                        queue === tab.key
                          ? 'bg-app-surface text-app-brand shadow-sm ring-1 ring-app-border'
                          : 'text-app-muted hover:text-app-text',
                      ].join(' ')}
                      key={tab.key}
                      onClick={() => setQueue(tab.key)}
                      type="button"
                    >
                      {tab.label}
                      <span className="ml-1.5 rounded-full bg-app-surface-hover px-1.5 py-0.5 text-[9px]">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {queue === 'waiting' ? (
                <QueueTable
                  empty="Nenhum atendimento aguardando execução."
                  tickets={data.waitingExecution}
                />
              ) : null}
              {queue === 'scheduled' ? (
                <QueueTable
                  empty="Nenhum atendimento agendado."
                  tickets={data.scheduled}
                />
              ) : null}
              {queue === 'hold' ? (
                <HoldsTable groups={data.holds} />
              ) : null}
              {queue === 'finished' ? (
                <QueueTable
                  empty="Nenhum atendimento finalizado ou concluído hoje."
                  tickets={data.finishedToday}
                />
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

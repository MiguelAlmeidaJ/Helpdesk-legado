"use client";

import {
  AppPermission,
  type CurrentUserResponse,
  type TechnicianAvailabilityItem,
  type TicketAvailabilityResponse,
  type TicketAvailabilityTicket,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { fetchTicketAvailability } from '../api/tickets-api';

const PANEL =
  'overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm';
const PANEL_HEADER =
  'flex min-h-10 items-center gap-2 border-b border-app-border bg-app-surface-muted px-3 py-2 text-sm font-black text-app-text';
const BUTTON =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover';

function canAudit(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.TicketsAudit,
  );
}

function ticketLink(ticket: TicketAvailabilityTicket) {
  return `/atendimentos/${ticket.id}`;
}

function groupByTechnician(tickets: TicketAvailabilityTicket[]) {
  const groups = new Map<string, TicketAvailabilityTicket[]>();
  for (const ticket of tickets) {
    const key = ticket.technicianName?.trim() || 'Sem Técnico';
    const current = groups.get(key) ?? [];
    current.push(ticket);
    groups.set(key, current);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
}

function TicketIds({
  tickets,
  waitingBadge = false,
}: {
  tickets: TicketAvailabilityTicket[];
  waitingBadge?: boolean;
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
      {tickets.map((ticket) => (
        <Link
          className="relative text-[11px] font-semibold text-app-text no-underline hover:text-app-brand hover:underline"
          href={ticketLink(ticket)}
          key={ticket.id}
          title={ticket.clientName ?? undefined}
        >
          {ticket.id}
          {waitingBadge && ticket.waitingCount > 0 ? (
            <sup className="ml-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[8px] font-black leading-none text-white">
              {ticket.waitingCount}
            </sup>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

function TechnicianList({
  items,
  empty,
  tone,
}: {
  items: TechnicianAvailabilityItem[];
  empty: string;
  tone: 'green' | 'red';
}) {
  if (!items.length) {
    return <div className="p-4 text-xs text-app-muted">{empty}</div>;
  }

  return (
    <div className="divide-y divide-app-border-soft px-3">
      {items.map((item) => (
        <div className="py-2.5" key={item.id}>
          <div
            className={[
              'flex items-center gap-2 text-xs font-black',
              tone === 'green'
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-red-600 dark:text-red-300',
            ].join(' ')}
          >
            <span className="text-[10px]">●</span>
            <span>{item.name}</span>
            {tone === 'red' ? <span>({item.executing.length})</span> : null}
          </div>
          {item.executing.length ? <TicketIds tickets={item.executing} /> : null}
        </div>
      ))}
    </div>
  );
}

function GroupedTicketList({
  tickets,
  waitingBadge = false,
}: {
  tickets: TicketAvailabilityTicket[];
  waitingBadge?: boolean;
}) {
  const groups = groupByTechnician(tickets);

  if (!groups.length) {
    return <div className="p-4 text-xs text-app-muted">Nenhum atendimento.</div>;
  }

  return (
    <div className="divide-y divide-app-border-soft px-3">
      {groups.map(([name, group]) => (
        <div className="py-2.5" key={name}>
          <strong className="text-xs text-app-text">
            {name} ({group.length})
          </strong>
          <TicketIds tickets={group} waitingBadge={waitingBadge} />
        </div>
      ))}
    </div>
  );
}

export function LegacyTicketAvailabilityScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const allowed = canAudit(currentUser);
  const [data, setData] = useState<TicketAvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(allowed);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!allowed) return;
    try {
      setError('');
      setData(await fetchTicketAvailability());
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.status === 403
          ? 'Seu usuário não possui acesso à Disponibilidade Técnica.'
          : 'Não foi possível carregar a disponibilidade.',
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

  const free = useMemo(
    () => data?.technicians.filter((item) => item.state === 'available') ?? [],
    [data],
  );
  const busy = useMemo(
    () => data?.technicians.filter((item) => item.state === 'busy') ?? [],
    [data],
  );
  const holds = useMemo(
    () => data?.holds.flatMap((group) => group.tickets) ?? [],
    [data],
  );

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          <div className="flex gap-2">
            <Link className={BUTTON} href="/atendimentos/disponibilidade">
              Disponibilidade atual
            </Link>
            <button className={BUTTON} disabled={loading} onClick={() => void load()} type="button">
              Atualizar
            </button>
          </div>
        }
        subtitle="Visual clássico da disponibilidade técnica."
        title="Disponibilidade Técnica · Antiga"
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1700px] px-3 py-3">
        {error ? (
          <div className="mb-3 rounded-lg border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger">
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="rounded-lg border border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
            Carregando disponibilidade…
          </div>
        ) : null}

        {data ? (
          <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1.04fr_1.04fr]">
            <div className="grid content-start gap-3">
              <section className={PANEL}>
                <header className={PANEL_HEADER}>
                  <span aria-hidden="true">👍</span>
                  Técnicos livres: {free.length}
                </header>
                <TechnicianList
                  empty="Nenhum técnico livre."
                  items={free}
                  tone="green"
                />
              </section>

              <section className={PANEL}>
                <header className={PANEL_HEADER}>
                  <span aria-hidden="true">🔔</span>
                  Atendimentos na fila: {data.waitingExecution.length}
                </header>
                <GroupedTicketList tickets={data.waitingExecution} />
              </section>

              <section className={PANEL}>
                <header className={PANEL_HEADER}>
                  <span aria-hidden="true">⌨️</span>
                  Atendimentos em execução: {data.summary.inProgress}
                </header>
                <GroupedTicketList
                  tickets={busy.flatMap((item) => item.executing)}
                />
              </section>

              <section className={PANEL}>
                <header className={PANEL_HEADER}>
                  <span aria-hidden="true">🗓️</span>
                  Atendimentos agendados: {data.scheduled.length}
                </header>
                <GroupedTicketList tickets={data.scheduled} />
              </section>
            </div>

            <section className={PANEL}>
              <header className={PANEL_HEADER}>
                <span aria-hidden="true">👎</span>
                Técnicos ocupados: {busy.length}
              </header>
              <TechnicianList
                empty="Nenhum técnico ocupado."
                items={busy}
                tone="red"
              />
            </section>

            <section className={PANEL}>
              <header className={PANEL_HEADER}>
                <span aria-hidden="true">⏸️</span>
                Atendimentos em espera: {holds.length}
              </header>
              <GroupedTicketList tickets={holds} waitingBadge />
            </section>

            <section className={PANEL}>
              <header className={PANEL_HEADER}>
                <span aria-hidden="true">✅</span>
                Atendimentos concluídos hoje: {data.finishedToday.length}
              </header>
              <GroupedTicketList tickets={data.finishedToday} />
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}

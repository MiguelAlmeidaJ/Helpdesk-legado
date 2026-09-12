"use client";

import {
  AppPermission,
  type CurrentUserResponse,
  type TechnicianAvailabilityItem,
  type TicketAvailabilityResponse,
  type TicketAvailabilityTicket,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { fetchTicketAvailability } from '../api/tickets-api';
import styles from './ticket-availability-screen.module.css';

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

function TicketChip({ ticket }: { ticket: TicketAvailabilityTicket }) {
  return (
    <Link
      className={styles.ticketChip}
      href={`/tickets/${ticket.id}`}
      title={`${ticket.clientName ?? 'Cliente não informado'} · ${ticket.typeLabel}`}
    >
      #{ticket.id}
    </Link>
  );
}

function TechnicianCard({ item }: { item: TechnicianAvailabilityItem }) {
  const stateLabel = {
    available: 'Disponível',
    busy: 'Ocupado',
    offline: 'Offline',
  }[item.state];

  return (
    <article className={styles.technician} data-state={item.state}>
      <div className={styles.technicianTop}>
        <div>
          <strong>{item.name}</strong>
          <span>Função {item.functionId}</span>
        </div>
        <span className={styles.state}>{stateLabel}</span>
      </div>
      {item.executing.length ? (
        <div className={styles.chips}>
          {item.executing.map((ticket) => (
            <TicketChip key={ticket.id} ticket={ticket} />
          ))}
        </div>
      ) : (
        <p className={styles.emptyInline}>
          {item.online ? 'Sem atendimento em execução.' : 'Sem sessão ativa nos últimos 10 minutos.'}
        </p>
      )}
    </article>
  );
}

function Queue({
  title,
  tickets,
}: {
  title: string;
  tickets: TicketAvailabilityTicket[];
}) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>{title}</h2>
        <span>{tickets.length}</span>
      </div>
      {tickets.length ? (
        <div className={styles.queue}>
          {tickets.map((ticket) => (
            <Link href={`/tickets/${ticket.id}`} key={ticket.id}>
              <strong>#{ticket.id}</strong>
              <span>{ticket.clientName ?? 'Cliente não informado'}</span>
              <span>{ticket.typeLabel}</span>
              <small>{formatDate(ticket.openedAt)}</small>
            </Link>
          ))}
        </div>
      ) : (
        <p className={styles.emptyInline}>Nenhum atendimento nesta fila.</p>
      )}
    </section>
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

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <AppSidebar />
          <Link className={styles.brand} href="/dashboard">
            <strong>Helpdesk</strong>
            <span>Nova plataforma</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <div>
            <span className={styles.eyebrow}>Operação</span>
            <h1>Disponibilidade Técnica</h1>
            <p>
              Presença considera sessão nativa utilizada nos últimos 10 minutos.
            </p>
          </div>
          <div className={styles.actions}>
            {allowed ? (
              <a href="/tickets/availability/waiting-report">
                Relatório de esperas
              </a>
            ) : null}
            <button disabled={!allowed || loading} onClick={() => void load()} type="button">
              Atualizar
            </button>
          </div>
        </div>

        {!allowed ? (
          <div className={styles.notice}>
            Seu usuário não possui a permissão de auditoria de atendimentos.
          </div>
        ) : null}
        {loading ? <div className={styles.notice}>Carregando disponibilidade…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        {data ? (
          <>
            <section className={styles.stats}>
              <div><span>Agendados</span><strong>{data.summary.scheduled}</strong></div>
              <div><span>Aguardando</span><strong>{data.summary.waitingExecution}</strong></div>
              <div><span>Em execução</span><strong>{data.summary.inProgress}</strong></div>
              <div><span>Em espera</span><strong>{data.summary.onHold}</strong></div>
              <div><span>Finalizados hoje</span><strong>{data.summary.finishedToday}</strong></div>
              <div><span>Disponíveis</span><strong>{data.summary.availableTechnicians}</strong></div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Técnicos</h2>
                <span>
                  {data.summary.onlineTechnicians} online · {data.summary.busyTechnicians} ocupados
                </span>
              </div>
              <div className={styles.technicians}>
                {data.technicians.map((item) => (
                  <TechnicianCard item={item} key={item.id} />
                ))}
              </div>
            </section>

            <div className={styles.twoColumns}>
              <Queue title="Aguardando execução" tickets={data.waitingExecution} />
              <Queue title="Agendados" tickets={data.scheduled} />
            </div>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Atendimentos em espera</h2>
                <span>{data.summary.onHold}</span>
              </div>
              {data.holds.length ? (
                <div className={styles.holdGroups}>
                  {data.holds.map((group) => (
                    <div className={styles.holdGroup} key={group.cause}>
                      <h3>{group.cause}</h3>
                      {group.tickets.map((ticket) => (
                        <Link href={`/tickets/${ticket.id}`} key={ticket.id}>
                          <strong>#{ticket.id}</strong>
                          <span>{ticket.clientName ?? 'Cliente não informado'}</span>
                          <span>{ticket.technicianName ?? 'Sem técnico'}</span>
                          <span>{ticket.waitingCount}x em espera</span>
                          <small>Previsão: {formatDate(ticket.holdForecastAt)}</small>
                          <p>{ticket.holdDescription?.trim() || 'Sem descrição informada.'}</p>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyInline}>Nenhum atendimento em espera.</p>
              )}
            </section>

            <Queue title="Finalizados ou concluídos hoje" tickets={data.finishedToday} />
          </>
        ) : null}
      </div>
    </main>
  );
}

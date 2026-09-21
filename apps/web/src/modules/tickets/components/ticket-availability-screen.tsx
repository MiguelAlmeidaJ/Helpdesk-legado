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
const styles = {
  page: 'min-h-screen bg-app-bg text-app-text',
  header:
    'flex min-h-[58px] items-center justify-between border-b border-app-border bg-[var(--app-header-bg)] px-6 backdrop-blur-xl max-[700px]:px-3',
  headerLeft: 'flex min-w-0 items-center gap-3.5',
  brand:
    'grid text-app-text no-underline [&_strong]:text-[15px] [&_span]:text-[10px] [&_span]:text-app-subtle',
  content:
    'mx-auto w-[min(1260px,calc(100%-32px))] py-[26px] pb-12 max-[700px]:w-[calc(100%-20px)]',
  titleRow:
    'mb-[18px] flex items-end justify-between gap-[18px] max-[700px]:flex-col max-[700px]:items-stretch [&_h1]:my-[3px] [&_h1]:text-[28px] [&_p]:m-0 [&_p]:text-xs [&_p]:text-app-muted',
  eyebrow:
    'text-[10px] font-extrabold uppercase tracking-[0.08em] text-app-muted',
  actions:
    'flex gap-2 max-[700px]:flex-wrap [&>*]:inline-flex [&>*]:min-h-[38px] [&>*]:items-center [&>*]:rounded-lg [&>*]:border [&>*]:border-app-border-strong [&>*]:bg-app-surface [&>*]:px-[13px] [&>*]:text-[11px] [&>*]:font-extrabold [&>*]:text-app-text-soft [&>*]:no-underline [&>*]:transition [&>*:hover]:bg-app-surface-hover [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50',
  stats:
    'mb-3 grid grid-cols-1 gap-2.5 min-[701px]:grid-cols-3 min-[1051px]:grid-cols-6 [&>div]:rounded-[11px] [&>div]:border [&>div]:border-app-border [&>div]:bg-app-surface [&>div]:p-[13px] [&_span]:block [&_span]:text-[9px] [&_span]:uppercase [&_span]:text-app-subtle [&_strong]:mt-[3px] [&_strong]:block [&_strong]:text-[23px]',
  card: 'mb-3 rounded-[11px] border border-app-border bg-app-surface p-[15px]',
  cardHeader:
    'mb-3 flex items-center justify-between gap-3 [&_h2]:m-0 [&_h2]:text-[15px] [&_span]:text-[10px] [&_span]:text-app-muted',
  technicians:
    'grid grid-cols-1 gap-[9px] min-[701px]:grid-cols-2 min-[1051px]:grid-cols-4',
  technician:
    'rounded-[9px] border border-app-border bg-app-surface-muted p-[11px]',
  technicianTop:
    'flex justify-between gap-2 [&>div]:grid [&>div]:min-w-0 [&_strong]:truncate [&_strong]:text-[11px]',
  technicianFunction: 'text-[9px] text-app-subtle',
  state: 'h-fit rounded-full px-1.5 py-[3px] text-[8px] font-extrabold',
  chips: 'mt-[9px] flex flex-wrap gap-[5px]',
  ticketChip:
    'rounded-md bg-app-brand-soft px-1.5 py-[3px] text-[9px] font-extrabold text-app-brand no-underline transition hover:bg-app-surface-hover',
  emptyInline: 'mt-[9px] mb-0 text-[10px] text-app-subtle',
  twoColumns: 'grid grid-cols-1 gap-3 min-[701px]:grid-cols-2',
  queue: 'grid gap-[5px]',
  queueItem:
    'grid grid-cols-1 items-center gap-2 rounded-lg bg-app-surface-muted px-[9px] py-2 text-[10px] text-app-text no-underline transition hover:bg-app-surface-hover min-[701px]:grid-cols-[70px_1.5fr_1fr_120px]',
  queueField: 'truncate',
  queueDate: 'truncate text-app-subtle min-[701px]:text-right',
  holdGroups: 'grid gap-3',
  holdGroup:
    '[&_h3]:mt-0 [&_h3]:mb-1.5 [&_h3]:border-b [&_h3]:border-app-border-soft [&_h3]:pb-[5px] [&_h3]:text-xs',
  holdItem:
    'mb-[5px] grid grid-cols-1 items-start gap-2 rounded-lg bg-app-surface-muted p-[9px] text-[10px] text-app-text no-underline transition hover:bg-app-surface-hover min-[701px]:grid-cols-[65px_1fr_1fr] min-[1051px]:grid-cols-[65px_1.4fr_1fr_90px_150px]',
  holdDescription:
    'col-span-full m-0 whitespace-pre-wrap text-app-muted min-[1051px]:col-start-2',
  notice:
    'mb-3 rounded-[9px] border border-app-border bg-app-surface px-3.5 py-3 text-xs text-app-muted',
  error:
    'mb-3 rounded-[9px] border border-app-danger-border bg-app-danger-soft px-3.5 py-3 text-xs text-app-danger',
} as const;

const technicianStateClass = {
  available:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
  busy: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
  offline: 'bg-app-surface-hover text-app-muted',
} as const;

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
      href={`/atendimentos/${ticket.id}`}
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
          <span className={styles.technicianFunction}>Função {item.functionId}</span>
        </div>
        <span className={`${styles.state} ${technicianStateClass[item.state]}`}>{stateLabel}</span>
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
            <Link className={styles.queueItem} href={`/atendimentos/${ticket.id}`} key={ticket.id}>
              <strong>#{ticket.id}</strong>
              <span className={styles.queueField}>{ticket.clientName ?? 'Cliente não informado'}</span>
              <span className={styles.queueField}>{ticket.typeLabel}</span>
              <small className={styles.queueDate}>{formatDate(ticket.openedAt)}</small>
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
          <Link className={styles.brand} href="/painel">
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
              <a href="/atendimentos/disponibilidade/relatorio-espera">
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
                        <Link className={styles.holdItem} href={`/atendimentos/${ticket.id}`} key={ticket.id}>
                          <strong>#{ticket.id}</strong>
                          <span>{ticket.clientName ?? 'Cliente não informado'}</span>
                          <span>{ticket.technicianName ?? 'Sem técnico'}</span>
                          <span>{ticket.waitingCount}x em espera</span>
                          <small>Previsão: {formatDate(ticket.holdForecastAt)}</small>
                          <p className={styles.holdDescription}>{ticket.holdDescription?.trim() || 'Sem descrição informada.'}</p>
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

"use client";

import {
  AppPermission,
  type CurrentUserResponse,
  type TicketTimelineEntry,
  type TicketTimelineResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { fetchTicketTimeline } from '../api/tickets-api';
const styles = {
  page: 'min-h-screen bg-app-bg text-app-text-soft',
  header:
    'flex min-h-[58px] items-center justify-between border-b border-app-border bg-app-surface px-6 max-[720px]:px-3',
  headerLeft: 'flex items-center gap-3.5',
  brand:
    'grid text-inherit no-underline [&_strong]:text-[15px] [&_span]:text-[10px] [&_span]:text-app-subtle',
  content:
    'mx-auto w-[calc(100%_-_32px)] max-w-[1100px] pt-[26px] pb-12 max-[720px]:w-[calc(100%_-_20px)]',
  titleRow:
    'mb-[18px] flex items-end justify-between gap-[18px] max-[720px]:flex-col max-[720px]:items-stretch [&_h1]:my-[3px] [&_h1]:text-[28px] [&_p]:m-0 [&_p]:text-xs [&_p]:text-app-muted [&_button]:min-h-[38px] [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-3.5 [&_button]:text-app-text-soft [&_button]:transition [&_button:hover]:bg-app-surface-hover [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50',
  eyebrow:
    'text-[10px] font-extrabold uppercase tracking-[0.08em] text-app-muted',
  summary:
    'mb-3 flex items-baseline gap-2 [&_strong]:text-[22px] [&_span]:text-[11px] [&_span]:text-app-muted',
  feed: 'grid gap-2.5',
  event:
    'rounded-[11px] border border-app-border bg-app-surface px-4 py-3.5 shadow-sm shadow-slate-950/5 dark:shadow-black/10',
  eventTop:
    'flex items-start justify-between gap-3 max-[720px]:flex-col [&>div]:flex [&>div]:items-center [&>div]:gap-2.5 [&_a]:text-xs [&_a]:font-extrabold [&_a]:text-app-brand [&_a]:no-underline [&_a:hover]:underline [&_time]:whitespace-nowrap [&_time]:text-[10px] [&_time]:text-app-subtle',
  kind:
    'rounded-full bg-app-surface-muted px-[7px] py-1 text-[9px] font-extrabold text-app-text-soft',
  description:
    'my-[11px] whitespace-pre-wrap text-xs leading-[1.5] text-app-text-soft',
  meta:
    'm-0 grid grid-cols-3 gap-x-3 gap-y-[7px] max-[720px]:grid-cols-2 [&_div]:min-w-0 [&_dt]:text-[8px] [&_dt]:font-extrabold [&_dt]:uppercase [&_dt]:text-app-subtle [&_dd]:mt-0.5 [&_dd]:mb-0 [&_dd]:overflow-hidden [&_dd]:text-ellipsis [&_dd]:whitespace-nowrap [&_dd]:text-[10px] [&_dd]:text-app-text-soft',
  notice:
    'rounded-[9px] border border-app-border bg-app-surface px-3.5 py-3 text-xs text-app-muted',
  error:
    'rounded-[9px] border border-app-danger-border bg-app-danger-soft px-3.5 py-3 text-xs text-app-danger',
} as const;

const INTERACTION_LABELS: Record<number, string> = {
  1: 'Abertura',
  2: 'Aceite',
  3: 'Devolução',
  4: 'Transferência',
  5: 'Enviado para espera',
  6: 'Retomada',
  7: 'Interação',
  8: 'Finalização',
  9: 'Edição',
  10: 'Concluído',
  11: 'Anexo removido',
  12: 'Anexo adicionado',
};

function canAudit(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.TicketsAudit,
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date);
}

function name(value: string | null): string {
  return value?.trim() || '—';
}

function TimelineItem({ item }: { item: TicketTimelineEntry }) {
  return (
    <article className={styles.event}>
      <div className={styles.eventTop}>
        <div>
          <span className={styles.kind}>
            {INTERACTION_LABELS[item.interactionType] ??
              `Evento ${item.interactionType}`}
          </span>
          <Link href={`/tickets/${item.ticketId}`}>
            Atendimento #{item.ticketId}
          </Link>
        </div>
        <time>{formatDate(item.occurredAt)}</time>
      </div>

      <p className={styles.description}>{item.description}</p>

      <dl className={styles.meta}>
        <div><dt>Usuário</dt><dd>{name(item.actor.name)}</dd></div>
        <div><dt>Cliente</dt><dd>{name(item.client.name)}</dd></div>
        <div><dt>Solicitante</dt><dd>{name(item.requester.name)}</dd></div>
        <div><dt>Técnico</dt><dd>{name(item.technician.name)}</dd></div>
        <div><dt>Categoria</dt><dd>{name(item.classification.category)}</dd></div>
        <div><dt>Subcategoria</dt><dd>{name(item.classification.subcategory)}</dd></div>
      </dl>
    </article>
  );
}

export function TicketTimelineScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const allowed = canAudit(currentUser);
  const [data, setData] = useState<TicketTimelineResponse | null>(null);
  const [loading, setLoading] = useState(allowed);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!allowed) return;

    try {
      setError(null);
      const response = await fetchTicketTimeline();
      setData(response);
    } catch (reason: unknown) {
      setError(
        reason instanceof ApiError && reason.status === 403
          ? 'Seu usuário não possui acesso à Timeline.'
          : 'Não foi possível carregar a Timeline.',
      );
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    void load();
    if (!allowed) return;

    const timer = window.setInterval(() => void load(), 60_000);
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
            <span className={styles.eyebrow}>Auditoria operacional</span>
            <h1>Timeline</h1>
            <p>Interações registradas nos atendimentos durante as últimas 24 horas.</p>
          </div>
          <button disabled={!allowed || loading} onClick={() => void load()} type="button">
            Atualizar
          </button>
        </div>

        {!allowed ? (
          <div className={styles.notice}>
            Seu usuário não possui a permissão de auditoria de atendimentos.
          </div>
        ) : null}
        {loading ? <div className={styles.notice}>Carregando Timeline…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        {data ? (
          <>
            <div className={styles.summary}>
              <strong>{data.items.length}</strong>
              <span>interações nas últimas {data.windowHours}h</span>
            </div>
            <section className={styles.feed}>
              {data.items.length ? (
                data.items.map((item) => (
                  <TimelineItem item={item} key={item.interactionId} />
                ))
              ) : (
                <div className={styles.notice}>
                  Nenhuma interação registrada nas últimas 24 horas.
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

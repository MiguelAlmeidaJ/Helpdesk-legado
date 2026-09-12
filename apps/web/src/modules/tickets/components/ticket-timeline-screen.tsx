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
import styles from './ticket-timeline-screen.module.css';

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

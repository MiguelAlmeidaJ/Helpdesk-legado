"use client";

import type { CurrentUserResponse, MarketingTicketCatalogsResponse, MarketingTicketListResponse } from '@helpdesk/contracts';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { fetchMarketingCreateCatalogs } from '../api/modular-ticket-create-api';
import { fetchMarketingTickets, type SpecializedTicketListQuery } from '../api/modular-ticket-read-api';
import styles from './specialized-ticket-screens.module.css';

interface Draft { clientId: string; technicianId: string; openedFrom: string; openedTo: string }

function localToday(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function initialDraft(): Draft {
  const today = localToday();
  return { clientId: '', technicianId: '', openedFrom: today, openedTo: today };
}

function initialQuery(draft: Draft): SpecializedTicketListQuery {
  return { page: 1, limit: 50, status: '1,2,3,4', openedFrom: draft.openedFrom, openedTo: draft.openedTo, sort: 'openedAt', direction: 'asc' };
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function duration(openedAt: string | null, closedAt: string | null): string {
  if (!openedAt || !closedAt) return 'Em aberto';
  const opened = new Date(openedAt).getTime();
  const closed = new Date(closedAt).getTime();
  if (!Number.isFinite(opened) || !Number.isFinite(closed) || closed < opened) return '—';
  return `${Math.floor((closed - opened) / 3_600_000).toLocaleString('pt-BR')} h`;
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.status === 403) return 'Seu usuário não possui acesso ao relatório de Marketing.';
    return `A API respondeu com erro ${reason.status}.`;
  }
  return reason instanceof Error ? reason.message : 'Não foi possível carregar o relatório de Marketing.';
}

export function MarketingTicketReportScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft());
  const [query, setQuery] = useState<SpecializedTicketListQuery>(() => initialQuery(initialDraft()));
  const [result, setResult] = useState<MarketingTicketListResponse | null>(null);
  const [catalogs, setCatalogs] = useState<MarketingTicketCatalogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchMarketingCreateCatalogs().then(setCatalogs).catch((reason: unknown) => setError(errorMessage(reason)));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchMarketingTickets(query, controller.signal)
      .then(setResult)
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === 'AbortError') return;
        setError(errorMessage(reason));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);

  const totalLabel = useMemo(() => {
    if (!result) return 'Carregando…';
    return `${result.meta.total.toLocaleString('pt-BR')} registro${result.meta.total === 1 ? '' : 's'}`;
  }, [result]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery((current) => ({ ...current, page: 1, clientId: draft.clientId || undefined, technicianId: draft.technicianId || undefined, openedFrom: draft.openedFrom || undefined, openedTo: draft.openedTo || undefined }));
  }

  function reset() {
    const next = initialDraft();
    setDraft(next);
    setQuery(initialQuery(next));
  }

  const page = result?.meta.page ?? query.page;
  const totalPages = result?.meta.totalPages ?? 0;

  return <main className="tickets-page">
    <header className="tickets-header"><div className="tickets-header-left"><AppSidebar /><Link className="tickets-brand" href="/dashboard"><strong>Helpdesk</strong><span>Nova plataforma</span></Link></div><div className="tickets-header-actions"><span className="tickets-total">{totalLabel}</span><SessionUserMenu user={currentUser} /></div></header>
    <div className="tickets-content">
      <div className="tickets-title-row"><div><span className="eyebrow">Tickets · Marketing · Relatório</span><h1>Tarefas por cliente e técnico</h1><p>Leitura analítica das demandas de Marketing. Marketing não possui SLA; a duração abaixo é apenas o intervalo entre abertura e fechamento.</p></div><Link className="button" href="/tickets/marketing">Voltar para tickets</Link></div>
      <form className="filters-panel" onSubmit={submit}><div className={styles.filterRow}>
        <label>Cliente<select onChange={(event) => setDraft((current) => ({ ...current, clientId: event.target.value }))} value={draft.clientId}><option value="">Todos os clientes</option>{(catalogs?.clients ?? []).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
        <label>Técnico<select onChange={(event) => setDraft((current) => ({ ...current, technicianId: event.target.value }))} value={draft.technicianId}><option value="">Todos</option>{(catalogs?.technicians ?? []).filter((option) => option.id > 0).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
        <label>De<input onChange={(event) => setDraft((current) => ({ ...current, openedFrom: event.target.value }))} type="date" value={draft.openedFrom} /></label>
        <label>Até<input onChange={(event) => setDraft((current) => ({ ...current, openedTo: event.target.value }))} type="date" value={draft.openedTo} /></label>
      </div><div className={styles.filtersActions}><button className="button" disabled={loading} onClick={reset} type="button">Hoje</button><button className="button button-primary" disabled={loading} type="submit">Filtrar</button></div></form>
      {loading ? <div className="loading-line" aria-label="Carregando" /> : null}{error ? <div className="feedback">{error}</div> : null}
      <section className="table-card" aria-label="Relatório de tarefas de Marketing"><div className="table-scroll"><table className="tickets-table"><thead><tr><th>ID</th><th>Cliente</th><th>Solicitante / Local</th><th>Classificação</th><th>Técnico</th><th>Abertura</th><th>Fechamento</th><th>Duração</th></tr></thead><tbody>
        {(result?.data ?? []).map((ticket) => <tr key={ticket.id}><td className="ticket-id"><Link className="ticket-id-link" href={`/tickets/marketing/${ticket.id}`}>#{ticket.id}</Link></td><td>{ticket.client.name || '—'}</td><td><div className={styles.ticketMain}><strong>{ticket.requester.name || '—'}</strong><span>{ticket.location.name || '—'}</span></div></td><td><div className={styles.ticketMain}><strong>{ticket.type.name || ticket.category.name || '—'}</strong><span>{[ticket.category.name, ticket.subcategory.name, ticket.level.name].filter(Boolean).join(' · ') || '—'}</span></div></td><td>{ticket.technician.name || 'Não atribuído'}</td><td>{formatDate(ticket.openedAt)}</td><td>{formatDate(ticket.closedAt)}</td><td>{duration(ticket.openedAt, ticket.closedAt)}</td></tr>)}
      </tbody></table></div>
      {!loading && !error && result?.data.length === 0 ? <div className="empty-state">Nenhuma tarefa de Marketing encontrada para o período.</div> : null}
      <div className="pagination"><span className="pagination-info">Página {page}{totalPages > 0 ? ` de ${totalPages}` : ''}</span><div className="pagination-actions"><button className="button" disabled={loading || page <= 1} onClick={() => setQuery((current) => ({ ...current, page: Math.max(1, current.page - 1) }))} type="button">Anterior</button><button className="button" disabled={loading || totalPages === 0 || page >= totalPages} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))} type="button">Próxima</button></div></div>
      </section>
    </div>
  </main>;
}

"use client";

import type { CurrentUserResponse, MarketingTicketListResponse } from '@helpdesk/contracts';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { fetchMarketingTickets, type SpecializedTicketListQuery } from '../api/modular-ticket-read-api';
import styles from './specialized-ticket-screens.module.css';

const ACTIVE_STATUS = '1,2,3';
interface Draft { search: string; status: string; openedFrom: string; openedTo: string }
const EMPTY_DRAFT: Draft = { search: '', status: ACTIVE_STATUS, openedFrom: '', openedTo: '' };

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.status === 403) return 'Seu usuário não possui acesso aos tickets de Marketing.';
    return `A API respondeu com erro ${reason.status}.`;
  }
  return reason instanceof Error ? reason.message : 'Não foi possível carregar os tickets de Marketing.';
}

export function MarketingTicketsScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const [query, setQuery] = useState<SpecializedTicketListQuery>({ page: 1, limit: 50, status: ACTIVE_STATUS, sort: 'status', direction: 'asc' });
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [result, setResult] = useState<MarketingTicketListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
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
    return `${result.meta.total.toLocaleString('pt-BR')} ticket${result.meta.total === 1 ? '' : 's'}`;
  }, [result]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery((current) => ({ ...current, page: 1, search: draft.search.trim() || undefined, status: draft.status, openedFrom: draft.openedFrom || undefined, openedTo: draft.openedTo || undefined }));
  }
  function clear() { setDraft(EMPTY_DRAFT); setQuery({ page: 1, limit: 50, status: ACTIVE_STATUS, sort: 'status', direction: 'asc' }); }

  const page = result?.meta.page ?? query.page;
  const totalPages = result?.meta.totalPages ?? 0;

  return <main className="tickets-page">
    <header className="tickets-header"><div className="tickets-header-left"><AppSidebar /><Link className="tickets-brand" href="/dashboard"><strong>Helpdesk</strong><span>Nova plataforma</span></Link></div><div className="tickets-header-actions"><span className="tickets-total">{totalLabel}</span><SessionUserMenu user={currentUser} /></div></header>
    <div className="tickets-content">
      <div className="tickets-title-row"><div><span className="eyebrow">Tickets · Marketing</span><h1>Marketing</h1><p>Demandas do terceiro andar com classificação e fluxo próprios, sem SLA.</p></div><Link className="button button-primary" href="/tickets/new?type=marketing">Novo ticket</Link></div>
      <form className="filters-panel" onSubmit={submit}><div className={styles.filterRow}>
        <label>Busca<input onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} placeholder="Nome, descrição ou cliente" type="search" value={draft.search} /></label>
        <label>Status<select onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} value={draft.status}><option value="1,2,3">Ativos</option><option value="0">Agendados</option><option value="4">Concluídos</option><option value="0,1,2,3,4">Todos</option></select></label>
        <label>Abertura de<input onChange={(event) => setDraft((current) => ({ ...current, openedFrom: event.target.value }))} type="date" value={draft.openedFrom} /></label>
        <label>Abertura até<input onChange={(event) => setDraft((current) => ({ ...current, openedTo: event.target.value }))} type="date" value={draft.openedTo} /></label>
      </div><div className={styles.filtersActions}><button className="button" disabled={loading} onClick={clear} type="button">Limpar</button><button className="button button-primary" disabled={loading} type="submit">Aplicar filtros</button></div></form>
      {loading ? <div className="loading-line" aria-label="Carregando" /> : null}{error ? <div className="feedback">{error}</div> : null}
      <section className="table-card" aria-label="Lista de tickets de Marketing"><div className="table-scroll"><table className="tickets-table"><thead><tr><th>ID</th><th>Ticket</th><th>Cliente</th><th>Classificação</th><th>Técnico</th><th>Status</th><th>Abertura</th></tr></thead><tbody>
        {(result?.data ?? []).map((ticket) => <tr key={ticket.id}><td className="ticket-id"><Link className="ticket-id-link" href={`/tickets/marketing/${ticket.id}`}>#{ticket.id}</Link></td><td><div className={styles.ticketMain}><strong>{ticket.name || 'Sem nome'}</strong><span>{ticket.openingDescription || 'Sem descrição'}</span></div></td><td>{ticket.client.name || '—'}</td><td>{[ticket.type.name, ticket.category.name, ticket.subcategory.name].filter(Boolean).join(' · ') || '—'}</td><td>{ticket.technician.name || 'Não atribuído'}</td><td><span className="status-pill">{ticket.statusLabel}</span></td><td>{formatDate(ticket.openedAt)}</td></tr>)}
      </tbody></table></div>
      {!loading && !error && result?.data.length === 0 ? <div className="empty-state">Nenhum ticket de Marketing encontrado com os filtros atuais.</div> : null}
      <div className="pagination"><span className="pagination-info">Página {page}{totalPages > 0 ? ` de ${totalPages}` : ''}</span><div className="pagination-actions"><button className="button" disabled={loading || page <= 1} onClick={() => setQuery((current) => ({ ...current, page: Math.max(1, current.page - 1) }))} type="button">Anterior</button><button className="button" disabled={loading || totalPages === 0 || page >= totalPages} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))} type="button">Próxima</button></div></div>
      </section>
    </div>
  </main>;
}

"use client";

import type { CurrentUserResponse, MarketingTicketDetailResponse } from '@helpdesk/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { fetchMarketingTicketDetail } from '../api/modular-ticket-read-api';
import styles from './specialized-ticket-screens.module.css';

function formatDate(value: string | null): string {
  if (!value) return '—'; const date = new Date(value); if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400); const hours = Math.floor((seconds % 86400) / 3600); const minutes = Math.floor((seconds % 3600) / 60);
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', `${minutes}min`].filter(Boolean).join(' ');
}
function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.status === 404) return 'Ticket de Marketing não encontrado ou fora do seu escopo.';
  if (reason instanceof ApiError && reason.status === 403) return 'Seu usuário não possui acesso a este ticket de Marketing.';
  if (reason instanceof ApiError) return `A API respondeu com erro ${reason.status}.`;
  return reason instanceof Error ? reason.message : 'Não foi possível carregar o ticket de Marketing.';
}

export function MarketingTicketDetailScreen({ currentUser, ticketId }: { currentUser: CurrentUserResponse; ticketId: number }) {
  const [ticket, setTicket] = useState<MarketingTicketDetailResponse | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { const controller = new AbortController(); fetchMarketingTicketDetail(ticketId, controller.signal).then(setTicket).catch((reason: unknown) => { if (!(reason instanceof Error && reason.name === 'AbortError')) setError(errorMessage(reason)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [ticketId]);
  return <main className="tickets-page"><header className="tickets-header"><div className="tickets-header-left"><AppSidebar /><Link className="tickets-brand" href="/dashboard"><strong>Helpdesk</strong><span>Nova plataforma</span></Link></div><SessionUserMenu user={currentUser} /></header><div className="tickets-content">
    <div className="tickets-title-row"><div><span className="eyebrow">Tickets · Marketing</span><h1>Marketing #{ticketId}</h1><p>{ticket?.name ?? 'Detalhe da demanda de Marketing.'}</p></div><Link className="button" href="/tickets/marketing">Voltar à lista</Link></div>
    {loading ? <div className="loading-line" aria-label="Carregando" /> : null}{error ? <div className="feedback">{error}</div> : null}
    {ticket ? <><section className={styles.detailCard}><div className={styles.detailHeader}><div><span className="eyebrow">Resumo</span><h2>{ticket.name}</h2></div><span className="status-pill">{ticket.statusLabel}</span></div><dl className={styles.detailGrid}>
      <div><dt>Cliente</dt><dd>{ticket.client.name || '—'}</dd></div><div><dt>Solicitante</dt><dd>{ticket.requester.name || '—'}</dd></div><div><dt>Local</dt><dd>{ticket.location.name || '—'}</dd></div><div><dt>Técnico</dt><dd>{ticket.technician.name || 'Não atribuído'}</dd></div><div><dt>Tipo</dt><dd>{ticket.type.name || '—'}</dd></div><div><dt>Categoria</dt><dd>{ticket.category.name || '—'}</dd></div><div><dt>Subcategoria</dt><dd>{ticket.subcategory.name || '—'}</dd></div><div><dt>Nível</dt><dd>{ticket.level.name || '—'}</dd></div><div><dt>Forma</dt><dd>{ticket.form ?? '—'}</dd></div><div><dt>Reincidente</dt><dd>{ticket.recurrent ? 'Sim' : 'Não'}</dd></div><div><dt>Espera acumulada</dt><dd>{formatDuration(ticket.waitSeconds)}</dd></div><div><dt>Abertura</dt><dd>{formatDate(ticket.openedAt)}</dd></div><div><dt>Fechamento</dt><dd>{formatDate(ticket.closedAt)}</dd></div><div><dt>Última atividade</dt><dd>{formatDate(ticket.lastActivityAt)}</dd></div>
    </dl></section><section className={styles.descriptionCard}><h2>Descrição de abertura</h2><p>{ticket.openingDescription || 'Sem descrição.'}</p></section>{ticket.closingDescription ? <section className={styles.descriptionCard}><h2>Descrição de fechamento</h2><p>{ticket.closingDescription}</p></section> : null}<section className={styles.timelineCard}><h2>Histórico</h2>{ticket.timeline.length === 0 ? <p className={styles.muted}>Nenhuma interação registrada.</p> : <ol className={styles.timeline}>{ticket.timeline.map((item) => <li className={styles.timelineItem} key={item.id}><div className={styles.timelineMeta}><strong>{item.user.name || 'Sistema'}</strong><span>{formatDate(item.at)}</span><span>Tipo {item.type}</span></div><div className={styles.timelineText}>{item.description || 'Sem descrição.'}</div></li>)}</ol>}</section></> : null}
  </div></main>;
}

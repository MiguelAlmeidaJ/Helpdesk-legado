"use client";

import type { CurrentUserResponse, TicketProjectListItem, TicketProjectTaskListItem } from '@helpdesk/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { fetchDevOpsProjectDetail, fetchDevOpsProjectTickets } from '../api/modular-ticket-read-api';
import styles from './specialized-ticket-screens.module.css';

function formatDate(value: string | null): string {
  if (!value) return '—'; const date = new Date(value); if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.status === 403) return 'Seu usuário não possui acesso a este projeto DevOps.';
  if (reason instanceof ApiError) return `A API respondeu com erro ${reason.status}.`;
  return reason instanceof Error ? reason.message : 'Não foi possível carregar o projeto DevOps.';
}

export function DevOpsProjectDetailScreen({ currentUser, projectId }: { currentUser: CurrentUserResponse; projectId: number }) {
  const [project, setProject] = useState<TicketProjectListItem | null>(null);
  const [tickets, setTickets] = useState<TicketProjectTaskListItem[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchDevOpsProjectDetail(projectId, controller.signal),
      fetchDevOpsProjectTickets(projectId, { page: 1, limit: 100, status: 'all', sort: 'id', direction: 'asc' }, controller.signal),
    ]).then(([nextProject, taskResponse]) => {
      if (!nextProject) setError('Projeto DevOps não encontrado ou fora do seu escopo.');
      else { setProject(nextProject); setTickets(taskResponse.data); }
    }).catch((reason: unknown) => { if (!(reason instanceof Error && reason.name === 'AbortError')) setError(errorMessage(reason)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [projectId]);

  return <main className="tickets-page"><header className="tickets-header"><div className="tickets-header-left"><AppSidebar /><Link className="tickets-brand" href="/dashboard"><strong>Helpdesk</strong><span>Nova plataforma</span></Link></div><SessionUserMenu user={currentUser} /></header><div className="tickets-content">
    <div className="tickets-title-row"><div><span className="eyebrow">DevOps · Projeto</span><h1>Projeto #{projectId}</h1><p>{project?.name ?? 'Grupo de tickets DevOps.'}</p></div><Link className="button" href="/tickets/devops/projects">Voltar aos projetos</Link></div>
    {loading ? <div className="loading-line" aria-label="Carregando" /> : null}{error ? <div className="feedback">{error}</div> : null}
    {project ? <><section className={styles.detailCard}><div className={styles.detailHeader}><div><span className="eyebrow">Resumo</span><h2>{project.name}</h2></div><span className="status-pill">{project.statusLabel}</span></div><dl className={styles.detailGrid}><div><dt>Cliente</dt><dd>{project.client.name || '—'}</dd></div><div><dt>Solicitante</dt><dd>{project.requester.name || '—'}</dd></div><div><dt>Local</dt><dd>{project.location.name || '—'}</dd></div><div><dt>Técnico</dt><dd>{project.technician.name || 'Não atribuído'}</dd></div><div><dt>Categoria</dt><dd>{project.category.name || '—'}</dd></div><div><dt>Subcategoria</dt><dd>{project.subcategory.name || '—'}</dd></div><div><dt>Abertura</dt><dd>{formatDate(project.openedAt)}</dd></div><div><dt>Última atividade</dt><dd>{formatDate(project.lastActivityAt)}</dd></div></dl></section><section className={styles.descriptionCard}><h2>Descrição de abertura</h2><p>{project.openingDescription || 'Sem descrição.'}</p></section><section className="table-card" aria-label="Tickets do projeto"><div className={styles.summaryRow}><div><span className="eyebrow">Tickets do projeto</span></div><strong>{tickets.length.toLocaleString('pt-BR')}</strong></div><div className="table-scroll"><table className="tickets-table"><thead><tr><th>ID</th><th>Ticket</th><th>Técnico</th><th>Status</th><th>Dias</th><th>Abertura</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><td className="ticket-id"><Link className="ticket-id-link" href={`/tickets/devops/${ticket.id}`}>#{ticket.id}</Link></td><td><div className={styles.ticketMain}><strong>{ticket.name}</strong><span>{ticket.openingDescription || 'Sem descrição'}</span></div></td><td>{ticket.technician.name || 'Não atribuído'}</td><td><span className="status-pill">{ticket.statusLabel}</span></td><td>{ticket.days ?? '—'}</td><td>{formatDate(ticket.openedAt)}</td></tr>)}</tbody></table></div>{tickets.length === 0 ? <div className="empty-state">Este projeto ainda não possui tickets visíveis no seu escopo.</div> : null}</section></> : null}
  </div></main>;
}

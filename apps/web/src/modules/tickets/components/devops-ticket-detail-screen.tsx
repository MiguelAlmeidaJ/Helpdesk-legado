"use client";

import type {
  CurrentUserResponse,
  TicketCatalogOption,
  TicketProjectTaskListItem,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { updateDevOpsTicketClassification } from '../api/modular-ticket-edit-api';
import { fetchDevOpsTicketDetail } from '../api/modular-ticket-read-api';
import {
  addDevOpsTicketInteraction,
  assignDevOpsTicket,
  fetchDevOpsWorkflowTechnicians,
  finalizeDevOpsTicket,
  holdDevOpsTicket,
  rejectDevOpsTicket,
  resumeDevOpsTicket,
  updateDevOpsTicketProgress,
} from '../api/modular-ticket-workflow-api';
import { DevOpsTicketClassificationEditor } from './devops-ticket-classification-editor';
import { DevOpsTicketImagesPanel } from './devops-ticket-images-panel';
import { SpecializedTicketWorkflowPanel } from './specialized-ticket-workflow-panel';
import styles from './specialized-ticket-screens.module.css';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', `${minutes}min`]
    .filter(Boolean)
    .join(' ');
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.status === 403) {
    return 'Seu usuário não possui acesso a este ticket DevOps.';
  }
  if (reason instanceof ApiError) return `A API respondeu com erro ${reason.status}.`;
  return reason instanceof Error
    ? reason.message
    : 'Não foi possível carregar o ticket DevOps.';
}

export function DevOpsTicketDetailScreen({
  currentUser,
  ticketId,
}: {
  currentUser: CurrentUserResponse;
  ticketId: number;
}) {
  const [ticket, setTicket] = useState<TicketProjectTaskListItem | null>(null);
  const [technicians, setTechnicians] = useState<TicketCatalogOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      fetchDevOpsTicketDetail(ticketId, controller.signal),
      fetchDevOpsWorkflowTechnicians().catch(() => [] as TicketCatalogOption[]),
    ])
      .then(([result, options]) => {
        if (!result) {
          setTicket(null);
          setError('Ticket DevOps não encontrado ou fora do seu escopo.');
          return;
        }
        setTicket(result);
        setTechnicians(options);
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof Error && reason.name === 'AbortError')) {
          setError(errorMessage(reason));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refreshToken, ticketId]);

  function refresh() {
    setRefreshToken((value) => value + 1);
  }

  return (
    <main className="tickets-page">
      <header className="tickets-header">
        <div className="tickets-header-left">
          <AppSidebar />
          <Link className="tickets-brand" href="/dashboard">
            <strong>Helpdesk</strong><span>Nova plataforma</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className="tickets-content">
        <div className="tickets-title-row">
          <div>
            <span className="eyebrow">Tickets · DevOps</span>
            <h1>DevOps #{ticketId}</h1>
            <p>{ticket?.name ?? 'Detalhe operacional do ticket.'}</p>
          </div>
          <Link className="button" href="/tickets/devops">Voltar à lista</Link>
        </div>

        {loading ? <div className="loading-line" aria-label="Carregando" /> : null}
        {error ? <div className="feedback">{error}</div> : null}

        {ticket ? (
          <>
            <section className={styles.detailCard}>
              <div className={styles.detailHeader}>
                <div><span className="eyebrow">Resumo</span><h2>{ticket.name}</h2></div>
                <span className="status-pill">{ticket.statusLabel}</span>
              </div>
              <dl className={styles.detailGrid}>
                <div><dt>Projeto</dt><dd>{ticket.project.id ? <Link className={styles.projectLink} href={`/tickets/devops/projects/${ticket.project.id}`}>{ticket.project.name || `#${ticket.project.id}`}</Link> : 'Sem projeto'}</dd></div>
                <div><dt>Cliente</dt><dd>{ticket.client.name || '—'}</dd></div>
                <div><dt>Solicitante</dt><dd>{ticket.requester.name || '—'}</dd></div>
                <div><dt>Local</dt><dd>{ticket.location.name || '—'}</dd></div>
                <div><dt>Categoria</dt><dd>{ticket.category.name || '—'}</dd></div>
                <div><dt>Subcategoria</dt><dd>{ticket.subcategory.name || '—'}</dd></div>
                <div><dt>Item</dt><dd>{ticket.item.name || '—'}</dd></div>
                <div><dt>Técnico</dt><dd>{ticket.technician.name || 'Não atribuído'}</dd></div>
                <div><dt>Nível</dt><dd>{ticket.level ?? '—'}</dd></div>
                <div><dt>Forma</dt><dd>{ticket.form ?? '—'}</dd></div>
                <div><dt>Dias</dt><dd>{ticket.days ?? '—'}</dd></div>
                <div><dt>Espera acumulada</dt><dd>{formatDuration(ticket.waitSeconds)}</dd></div>
                <div><dt>Abertura</dt><dd>{formatDate(ticket.openedAt)}</dd></div>
                <div><dt>Fechamento</dt><dd>{formatDate(ticket.closedAt)}</dd></div>
                <div><dt>Última atividade</dt><dd>{formatDate(ticket.lastActivityAt)}</dd></div>
              </dl>
            </section>

            <section className={styles.descriptionCard}>
              <h2>Descrição de abertura</h2>
              <p>{ticket.openingDescription || 'Sem descrição.'}</p>
            </section>

            {ticket.closingDescription ? (
              <section className={styles.descriptionCard}>
                <h2>Descrição de fechamento</h2>
                <p>{ticket.closingDescription}</p>
              </section>
            ) : null}

            <DevOpsTicketClassificationEditor
              onChanged={refresh}
              onSave={(input) => updateDevOpsTicketClassification(ticketId, input)}
              resourceLabel="ticket DevOps"
              value={{
                typeId: ticket.typeId,
                categoryId: ticket.category.id,
                subcategoryId: ticket.subcategory.id,
                itemId: ticket.item.id,
                levelId: ticket.level,
                formId: ticket.form,
                openingDescription: ticket.openingDescription,
              }}
            />

            <SpecializedTicketWorkflowPanel
              actions={{
                interaction: (description) => addDevOpsTicketInteraction(ticketId, { description }),
                assignment: (technicianId) => assignDevOpsTicket(ticketId, { technicianId }),
                hold: (forecastAt, description) => holdDevOpsTicket(ticketId, { forecastAt, description }),
                resume: () => resumeDevOpsTicket(ticketId),
                reject: (technicianId, reason) => rejectDevOpsTicket(ticketId, { technicianId, reason }),
                finalize: (description) => finalizeDevOpsTicket(ticketId, { description }),
                progress: (progress) => updateDevOpsTicketProgress(ticketId, { progress }),
              }}
              assignedTechnicianId={ticket.technician.id}
              currentUser={currentUser}
              onChanged={refresh}
              resourceLabel="ticket DevOps"
              status={ticket.status}
              statusLabel={ticket.statusLabel}
              technicians={technicians}
            />

            <DevOpsTicketImagesPanel ticketId={ticketId} />
          </>
        ) : null}
      </div>
    </main>
  );
}

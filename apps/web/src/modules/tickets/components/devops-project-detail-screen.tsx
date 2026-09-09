"use client";

import type {
  CurrentUserResponse,
  TicketCatalogOption,
  TicketProjectListItem,
  TicketProjectTaskListItem,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { updateDevOpsProjectClassification } from '../api/modular-ticket-edit-api';
import {
  fetchDevOpsProjectDetail,
  fetchDevOpsProjectTickets,
} from '../api/modular-ticket-read-api';
import {
  addDevOpsProjectInteraction,
  assignDevOpsProject,
  fetchDevOpsWorkflowTechnicians,
  finalizeDevOpsProject,
  holdDevOpsProject,
  rejectDevOpsProject,
  resumeDevOpsProject,
} from '../api/modular-ticket-workflow-api';
import { DevOpsTicketClassificationEditor } from './devops-ticket-classification-editor';
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

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.status === 403) {
    return 'Seu usuário não possui acesso a este projeto DevOps.';
  }
  if (reason instanceof ApiError) return `A API respondeu com erro ${reason.status}.`;
  return reason instanceof Error
    ? reason.message
    : 'Não foi possível carregar o projeto DevOps.';
}

export function DevOpsProjectDetailScreen({
  currentUser,
  projectId,
}: {
  currentUser: CurrentUserResponse;
  projectId: number;
}) {
  const [project, setProject] = useState<TicketProjectListItem | null>(null);
  const [tickets, setTickets] = useState<TicketProjectTaskListItem[]>([]);
  const [technicians, setTechnicians] = useState<TicketCatalogOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      fetchDevOpsProjectDetail(projectId, controller.signal),
      fetchDevOpsProjectTickets(
        projectId,
        { page: 1, limit: 100, status: 'all', sort: 'id', direction: 'asc' },
        controller.signal,
      ),
      fetchDevOpsWorkflowTechnicians().catch(() => [] as TicketCatalogOption[]),
    ])
      .then(([nextProject, taskResponse, options]) => {
        if (!nextProject) {
          setProject(null);
          setError('Projeto DevOps não encontrado ou fora do seu escopo.');
          return;
        }
        setProject(nextProject);
        setTickets(taskResponse.data);
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
  }, [projectId, refreshToken]);

  function refresh() {
    setRefreshToken((value) => value + 1);
  }

  return (
    <main className="tickets-page">
      <header className="tickets-header">
        <div className="tickets-header-left">
          <AppSidebar />
          <Link className="tickets-brand" href="/dashboard"><strong>Helpdesk</strong><span>Nova plataforma</span></Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className="tickets-content">
        <div className="tickets-title-row">
          <div><span className="eyebrow">DevOps · Projeto</span><h1>Projeto #{projectId}</h1><p>{project?.name ?? 'Grupo de tickets DevOps.'}</p></div>
          <div className="tickets-header-actions">
            {project && project.status !== 4 ? (
              <Link className="button button-primary" href={`/tickets/new?type=devops&projectId=${projectId}`}>Nova tarefa neste projeto</Link>
            ) : null}
            <Link className="button" href="/tickets/devops/projects">Voltar aos projetos</Link>
          </div>
        </div>

        {loading ? <div className="loading-line" aria-label="Carregando" /> : null}
        {error ? <div className="feedback">{error}</div> : null}

        {project ? (
          <>
            <section className={styles.detailCard}>
              <div className={styles.detailHeader}><div><span className="eyebrow">Resumo</span><h2>{project.name}</h2></div><span className="status-pill">{project.statusLabel}</span></div>
              <dl className={styles.detailGrid}>
                <div><dt>Cliente</dt><dd>{project.client.name || '—'}</dd></div>
                <div><dt>Solicitante</dt><dd>{project.requester.name || '—'}</dd></div>
                <div><dt>Local</dt><dd>{project.location.name || '—'}</dd></div>
                <div><dt>Técnico</dt><dd>{project.technician.name || 'Não atribuído'}</dd></div>
                <div><dt>Categoria</dt><dd>{project.category.name || '—'}</dd></div>
                <div><dt>Subcategoria</dt><dd>{project.subcategory.name || '—'}</dd></div>
                <div><dt>Abertura</dt><dd>{formatDate(project.openedAt)}</dd></div>
                <div><dt>Última atividade</dt><dd>{formatDate(project.lastActivityAt)}</dd></div>
              </dl>
            </section>

            <section className={styles.descriptionCard}><h2>Descrição de abertura</h2><p>{project.openingDescription || 'Sem descrição.'}</p></section>

            <DevOpsTicketClassificationEditor
              onChanged={refresh}
              onSave={(input) => updateDevOpsProjectClassification(projectId, input)}
              resourceLabel="projeto DevOps"
              value={{
                typeId: project.typeId,
                categoryId: project.category.id,
                subcategoryId: project.subcategory.id,
                itemId: project.item.id,
                levelId: project.level,
                formId: project.form,
                openingDescription: project.openingDescription,
              }}
            />

            <SpecializedTicketWorkflowPanel
              actions={{
                interaction: (description) => addDevOpsProjectInteraction(projectId, { description }),
                assignment: (technicianId) => assignDevOpsProject(projectId, { technicianId }),
                hold: (forecastAt, description) => holdDevOpsProject(projectId, { forecastAt, description }),
                resume: () => resumeDevOpsProject(projectId),
                reject: (technicianId, reason) => rejectDevOpsProject(projectId, { technicianId, reason }),
                finalize: (description) => finalizeDevOpsProject(projectId, { description }),
              }}
              assignedTechnicianId={project.technician.id}
              currentUser={currentUser}
              onChanged={refresh}
              resourceLabel="projeto DevOps"
              status={project.status}
              statusLabel={project.statusLabel}
              technicians={technicians}
            />

            <section className="table-card" aria-label="Tickets do projeto">
              <div className={styles.summaryRow}><div><span className="eyebrow">Tickets do projeto</span></div><strong>{tickets.length.toLocaleString('pt-BR')}</strong></div>
              <div className="table-scroll"><table className="tickets-table"><thead><tr><th>ID</th><th>Ticket</th><th>Técnico</th><th>Status</th><th>Dias</th><th>Abertura</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><td className="ticket-id"><Link className="ticket-id-link" href={`/tickets/devops/${ticket.id}`}>#{ticket.id}</Link></td><td><div className={styles.ticketMain}><strong>{ticket.name}</strong><span>{ticket.openingDescription || 'Sem descrição'}</span></div></td><td>{ticket.technician.name || 'Não atribuído'}</td><td><span className="status-pill">{ticket.statusLabel}</span></td><td>{ticket.days ?? '—'}</td><td>{formatDate(ticket.openedAt)}</td></tr>)}</tbody></table></div>
              {tickets.length === 0 ? <div className="empty-state">Este projeto ainda não possui tickets visíveis no seu escopo.</div> : null}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

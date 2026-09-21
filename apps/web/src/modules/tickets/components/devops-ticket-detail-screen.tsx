"use client";

import type {
  CurrentUserResponse,
  TicketCatalogOption,
  TicketProjectTaskListItem,
} from '@helpdesk/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { updateDevOpsTicketClassification } from '../api/modular-ticket-edit-api';
import {
  fetchDevOpsProjectTickets,
  fetchDevOpsTicketDetail,
} from '../api/modular-ticket-read-api';
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
import { DevOpsTaskDependencyEditor } from './devops-task-dependency-editor';
import { DevOpsTicketImagesPanel } from './devops-ticket-images-panel';
import { SpecializedTicketWorkflowPanel } from './specialized-ticket-workflow-panel';

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft no-underline transition-colors hover:bg-app-surface-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--app-brand-ring)]';
const CARD_CLASS =
  'mb-4 rounded-[14px] border border-app-border bg-app-surface p-[1.15rem] shadow-sm shadow-slate-950/5 dark:shadow-black/10';
const DETAIL_GRID_CLASS =
  'm-0 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4';

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
    return 'Seu usuário não possui acesso a este atendimento DevOps.';
  }
  if (reason instanceof ApiError) return `A API respondeu com erro ${reason.status}.`;
  return reason instanceof Error
    ? reason.message
    : 'Não foi possível carregar o atendimento DevOps.';
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 text-[0.78rem] font-bold tracking-[0.02em] text-app-muted">
        {label}
      </dt>
      <dd className="m-0 [overflow-wrap:anywhere] text-sm text-app-text-soft">
        {children}
      </dd>
    </div>
  );
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
  const [dependencyOptions, setDependencyOptions] = useState<TicketProjectTaskListItem[]>([]);
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
      .then(async ([result, options]) => {
        if (!result) {
          setTicket(null);
          setDependencyOptions([]);
          setError('Atendimento DevOps não encontrado ou fora do seu escopo.');
          return;
        }
        setTicket(result);
        setTechnicians(options);

        const projectId = result.project.id;
        if (!projectId) {
          setDependencyOptions([]);
          return;
        }

        const projectTasks = await fetchDevOpsProjectTickets(
          projectId,
          { page: 1, limit: 100, status: 'all', sort: 'id', direction: 'asc' },
          controller.signal,
        );
        setDependencyOptions(projectTasks.data);
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
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          <Link className={BUTTON_CLASS} href="/atendimentos/devops">
            Voltar à lista
          </Link>
        }
        subtitle={ticket?.name ?? 'Detalhe operacional da tarefa DevOps.'}
        title={`DevOps #${ticketId}`}
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1500px] px-6 py-6 max-sm:px-3.5">

        {loading ? (
          <div
            className="mb-3 h-1 overflow-hidden rounded-full bg-app-border"
            aria-label="Carregando"
            role="progressbar"
          >
            <div className="h-full w-1/3 animate-pulse rounded-full bg-app-brand" />
          </div>
        ) : null}
        {error ? (
          <div
            className="mb-4 rounded-lg border border-app-danger-border bg-app-danger-soft px-4 py-3.5 text-sm text-app-danger"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {ticket ? (
          <>
            <section className={CARD_CLASS}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
                    Resumo
                  </span>
                  <h2 className="m-0 text-[1.05rem] font-bold text-app-text">
                    {ticket.name}
                  </h2>
                </div>
                <span className="inline-flex items-center rounded-full bg-app-surface-muted px-2.5 py-1 text-xs font-extrabold text-app-text-soft ring-1 ring-inset ring-app-border-soft">
                  {ticket.statusLabel}
                </span>
              </div>

              <dl className={DETAIL_GRID_CLASS}>
                <DetailItem label="Projeto">
                  {ticket.project.id ? (
                    <Link
                      className="font-semibold text-app-brand underline decoration-[var(--app-border-strong)] underline-offset-[0.16em] hover:decoration-current"
                      href={`/atendimentos/devops/projetos/${ticket.project.id}`}
                    >
                      {ticket.project.name || `#${ticket.project.id}`}
                    </Link>
                  ) : (
                    'Sem projeto'
                  )}
                </DetailItem>
                <DetailItem label="Cliente">{ticket.client.name || '—'}</DetailItem>
                <DetailItem label="Solicitante">{ticket.requester.name || '—'}</DetailItem>
                <DetailItem label="Local">{ticket.location.name || '—'}</DetailItem>
                <DetailItem label="Categoria">{ticket.category.name || '—'}</DetailItem>
                <DetailItem label="Subcategoria">{ticket.subcategory.name || '—'}</DetailItem>
                <DetailItem label="Item">{ticket.item.name || '—'}</DetailItem>
                <DetailItem label="Técnico">{ticket.technician.name || 'Não atribuído'}</DetailItem>
                <DetailItem label="Nível">{ticket.level ?? '—'}</DetailItem>
                <DetailItem label="Forma">{ticket.form ?? '—'}</DetailItem>
                <DetailItem label="Dias">{ticket.days ?? '—'}</DetailItem>
                <DetailItem label="Espera acumulada">{formatDuration(ticket.waitSeconds)}</DetailItem>
                <DetailItem label="Abertura">{formatDate(ticket.openedAt)}</DetailItem>
                <DetailItem label="Fechamento">{formatDate(ticket.closedAt)}</DetailItem>
                <DetailItem label="Última atividade">{formatDate(ticket.lastActivityAt)}</DetailItem>
              </dl>
            </section>

            <section className={CARD_CLASS}>
              <h2 className="m-0 text-[1.05rem] font-bold text-app-text">Descrição de abertura</h2>
              <p className="mb-0 mt-2.5 whitespace-pre-wrap text-sm leading-6 text-app-text-soft">
                {ticket.openingDescription || 'Sem descrição.'}
              </p>
            </section>

            {ticket.closingDescription ? (
              <section className={CARD_CLASS}>
                <h2 className="m-0 text-[1.05rem] font-bold text-app-text">Descrição de fechamento</h2>
                <p className="mb-0 mt-2.5 whitespace-pre-wrap text-sm leading-6 text-app-text-soft">
                  {ticket.closingDescription}
                </p>
              </section>
            ) : null}

            <DevOpsTicketClassificationEditor
              onChanged={refresh}
              onSave={(input) => updateDevOpsTicketClassification(ticketId, input)}
              resourceLabel="atendimento DevOps"
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

            <DevOpsTaskDependencyEditor
              dependencyTaskId={ticket.dependencyTaskId}
              onChanged={refresh}
              options={dependencyOptions}
              projectId={ticket.project.id}
              ticketId={ticketId}
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
              resourceLabel="atendimento DevOps"
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

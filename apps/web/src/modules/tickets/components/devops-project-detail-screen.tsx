"use client";

import type {
  CurrentUserResponse,
  TicketCatalogOption,
  TicketProjectListItem,
  TicketProjectTaskListItem,
} from '@helpdesk/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
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

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft no-underline transition-colors hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_BUTTON_CLASS = `${BUTTON_CLASS} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;
const TABLE_CELL_CLASS =
  'border-b border-app-border-soft px-3 py-3 align-top text-left text-[13px]';
const TABLE_HEADER_CLASS =
  'sticky top-0 border-b border-app-border-soft bg-app-surface-muted px-3 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-app-muted';
const CARD_CLASS =
  'mb-4 rounded-xl border border-app-border bg-app-surface p-[18px] shadow-sm shadow-slate-950/5 dark:shadow-black/10';

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

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 text-xs font-bold tracking-[0.02em] text-app-muted">{label}</dt>
      <dd className="m-0 break-words text-sm text-app-text">{children}</dd>
    </div>
  );
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
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          <div className="flex items-center gap-2">
            {project && project.status !== 4 ? (
              <Link
                className={PRIMARY_BUTTON_CLASS}
                href={`/atendimentos/devops/nova-tarefa?projectId=${projectId}`}
              >
                Nova tarefa
              </Link>
            ) : null}
            <Link className={BUTTON_CLASS} href="/atendimentos/devops/projetos">
              Voltar aos projetos
            </Link>
          </div>
        }
        subtitle={project?.name ?? 'Grupo de tarefas DevOps.'}
        title={`Projeto #${projectId}`}
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

        {project ? (
          <>
            <section className={CARD_CLASS}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
                    Resumo
                  </span>
                  <h2 className="m-0 text-[17px] font-bold text-app-text">{project.name}</h2>
                </div>
                <span className="inline-flex items-center rounded-full bg-app-surface-muted px-2.5 py-1 text-xs font-extrabold whitespace-nowrap text-app-text-soft">
                  {project.statusLabel}
                </span>
              </div>
              <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DetailItem label="Cliente">{project.client.name || '—'}</DetailItem>
                <DetailItem label="Solicitante">{project.requester.name || '—'}</DetailItem>
                <DetailItem label="Local">{project.location.name || '—'}</DetailItem>
                <DetailItem label="Técnico">{project.technician.name || 'Não atribuído'}</DetailItem>
                <DetailItem label="Categoria">{project.category.name || '—'}</DetailItem>
                <DetailItem label="Subcategoria">{project.subcategory.name || '—'}</DetailItem>
                <DetailItem label="Abertura">{formatDate(project.openedAt)}</DetailItem>
                <DetailItem label="Última atividade">{formatDate(project.lastActivityAt)}</DetailItem>
              </dl>
            </section>

            <section className={CARD_CLASS}>
              <h2 className="m-0 text-[17px] font-bold text-app-text">Descrição de abertura</h2>
              <p className="mt-2.5 mb-0 whitespace-pre-wrap text-sm leading-6 text-app-text-soft">
                {project.openingDescription || 'Sem descrição.'}
              </p>
            </section>

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

            <section
              className="mb-4 overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm shadow-slate-950/5 dark:shadow-black/10"
              aria-label="Atendimentos do projeto"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft px-4 py-3.5">
                <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
                  Atendimentos do projeto
                </span>
                <strong className="text-lg text-app-text">
                  {tickets.length.toLocaleString('pt-BR')}
                </strong>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse">
                  <thead>
                    <tr>
                      <th className={TABLE_HEADER_CLASS}>ID</th>
                      <th className={TABLE_HEADER_CLASS}>Atendimento</th>
                      <th className={TABLE_HEADER_CLASS}>Técnico</th>
                      <th className={TABLE_HEADER_CLASS}>Status</th>
                      <th className={TABLE_HEADER_CLASS}>Dias</th>
                      <th className={TABLE_HEADER_CLASS}>Abertura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr className="transition-colors hover:bg-app-surface-muted" key={ticket.id}>
                        <td className={`${TABLE_CELL_CLASS} font-extrabold`}>
                          <Link
                            className="font-extrabold text-app-brand no-underline hover:underline focus-visible:underline"
                            href={`/atendimentos/devops/${ticket.id}`}
                          >
                            #{ticket.id}
                          </Link>
                        </td>
                        <td className={TABLE_CELL_CLASS}>
                          <div className="grid min-w-[220px] gap-0.5">
                            <strong className="text-app-text">{ticket.name}</strong>
                            <span className="max-w-[420px] truncate text-app-muted-strong">
                              {ticket.openingDescription || 'Sem descrição'}
                            </span>
                          </div>
                        </td>
                        <td className={TABLE_CELL_CLASS}>{ticket.technician.name || 'Não atribuído'}</td>
                        <td className={TABLE_CELL_CLASS}>
                          <span className="inline-flex items-center rounded-full bg-app-surface-muted px-2 py-1 text-xs font-extrabold whitespace-nowrap text-app-text-soft">
                            {ticket.statusLabel}
                          </span>
                        </td>
                        <td className={TABLE_CELL_CLASS}>{ticket.days ?? '—'}</td>
                        <td className={TABLE_CELL_CLASS}>{formatDate(ticket.openedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tickets.length === 0 ? (
                <div className="px-5 py-10 text-center text-app-muted-strong">
                  Este projeto ainda não possui atendimentos visíveis no seu escopo.
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

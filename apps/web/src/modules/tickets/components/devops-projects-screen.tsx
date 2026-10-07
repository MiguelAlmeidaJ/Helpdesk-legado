"use client";

import type {
  CurrentUserResponse,
  TicketProjectListResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import {
  fetchDevOpsProjects,
  type SpecializedTicketListQuery,
} from '../api/modular-ticket-read-api';

const ACTIVE_STATUS = '1,2,3';

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft no-underline transition-colors hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_BUTTON_CLASS = `${BUTTON_CLASS} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;
const FIELD_CONTROL_CLASS =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';
const FIELD_LABEL_CLASS = 'text-xs font-extrabold text-app-muted';

interface Draft {
  search: string;
  clientId: string;
  technicianId: string;
  status: string;
  openedFrom: string;
  openedTo: string;
}

const EMPTY_DRAFT: Draft = {
  search: '',
  clientId: '',
  technicianId: '',
  status: ACTIVE_STATUS,
  openedFrom: '',
  openedTo: '',
};

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
    return 'Seu usuário não possui acesso aos projetos DevOps.';
  }
  if (reason instanceof ApiError) return `A API respondeu com erro ${reason.status}.`;
  return reason instanceof Error
    ? reason.message
    : 'Não foi possível carregar os projetos DevOps.';
}

function projectStatusClass(status: number): string {
  if (status === 4) return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 2) return 'border-app-brand/30 bg-[var(--app-brand-soft)] text-app-brand';
  if (status === 3) return 'border-amber-400/35 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'border-app-border bg-app-surface-muted text-app-text-soft';
}

export function DevOpsProjectsScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [query, setQuery] = useState<SpecializedTicketListQuery>({
    page: 1,
    limit: 50,
    status: ACTIVE_STATUS,
    sort: 'status',
    direction: 'asc',
  });
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [result, setResult] = useState<TicketProjectListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchDevOpsProjects(query, controller.signal)
      .then(setResult)
      .catch((reason: unknown) => {
        if (!(reason instanceof Error && reason.name === 'AbortError')) {
          setError(errorMessage(reason));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query]);

  const totalLabel = useMemo(() => {
    if (!result) return 'Carregando…';
    return `${result.meta.total.toLocaleString('pt-BR')} projeto${
      result.meta.total === 1 ? '' : 's'
    }`;
  }, [result]);

  const visibleSummary = useMemo(() => {
    const projects = result?.data ?? [];
    const taskCount = projects.reduce((total, project) => total + project.tasks.total, 0);
    const blockedCount = projects.filter((project) => project.tasks.blocked > 0).length;
    const averageProgress = projects.length
      ? Math.round(
          projects.reduce((total, project) => total + project.tasks.progressPercent, 0) /
            projects.length,
        )
      : 0;
    return { taskCount, blockedCount, averageProgress };
  }, [result]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery((current) => ({
      ...current,
      page: 1,
      search: draft.search.trim() || undefined,
      clientId: draft.clientId || undefined,
      technicianId: draft.technicianId || undefined,
      status: draft.status,
      openedFrom: draft.openedFrom || undefined,
      openedTo: draft.openedTo || undefined,
    }));
  }

  function clear() {
    setDraft(EMPTY_DRAFT);
    setQuery({
      page: 1,
      limit: 50,
      status: ACTIVE_STATUS,
      sort: 'status',
      direction: 'asc',
    });
  }

  const page = result?.meta.page ?? query.page;
  const totalPages = result?.meta.totalPages ?? 0;

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          <div className="flex items-center gap-2 max-md:[&>a:last-child]:hidden">
            <Link className={PRIMARY_BUTTON_CLASS} href="/atendimentos/devops/projetos/novo">
              Novo projeto
            </Link>
            <Link className={BUTTON_CLASS} href="/atendimentos/devops">
              Voltar às tarefas
            </Link>
          </div>
        }
        meta={<span className="text-sm text-app-muted max-lg:hidden">{totalLabel}</span>}
        subtitle="Acompanhe projetos pelo progresso real das tarefas vinculadas."
        title="Projetos DevOps"
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1500px] px-6 py-6 max-sm:px-3.5">

        <form
          className="mb-4 rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10"
          onSubmit={submit}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="grid gap-1.5">
              <label className={FIELD_LABEL_CLASS} htmlFor="devops-project-search">Busca</label>
              <input
                className={FIELD_CONTROL_CLASS}
                id="devops-project-search"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, search: event.target.value }))
                }
                placeholder="Nome, descrição ou cliente"
                type="search"
                value={draft.search}
              />
            </div>
            <div className="grid gap-1.5">
              <label className={FIELD_LABEL_CLASS} htmlFor="devops-project-status">Status</label>
              <select
                className={FIELD_CONTROL_CLASS}
                id="devops-project-status"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, status: event.target.value }))
                }
                value={draft.status}
              >
                <option value="1,2,3">Ativos</option>
                <option value="0">Agendados</option>
                <option value="4">Concluídos</option>
                <option value="all">Todos</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className={FIELD_LABEL_CLASS} htmlFor="devops-project-client">Cliente</label>
              <select
                className={FIELD_CONTROL_CLASS}
                id="devops-project-client"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, clientId: event.target.value }))
                }
                value={draft.clientId}
              >
                <option value="">Todos</option>
                {(result?.options.clients ?? []).map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className={FIELD_LABEL_CLASS} htmlFor="devops-project-technician">Técnico</label>
              <select
                className={FIELD_CONTROL_CLASS}
                id="devops-project-technician"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, technicianId: event.target.value }))
                }
                value={draft.technicianId}
              >
                <option value="">Todos</option>
                {(result?.options.technicians ?? []).map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className={FIELD_LABEL_CLASS} htmlFor="devops-project-opened-from">Abertura de</label>
              <input
                className={FIELD_CONTROL_CLASS}
                id="devops-project-opened-from"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, openedFrom: event.target.value }))
                }
                type="date"
                value={draft.openedFrom}
              />
            </div>
            <div className="grid gap-1.5">
              <label className={FIELD_LABEL_CLASS} htmlFor="devops-project-opened-to">Abertura até</label>
              <input
                className={FIELD_CONTROL_CLASS}
                id="devops-project-opened-to"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, openedTo: event.target.value }))
                }
                type="date"
                value={draft.openedTo}
              />
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2 max-sm:[&>*]:flex-1">
            <button className={BUTTON_CLASS} disabled={loading} onClick={clear} type="button">
              Limpar
            </button>
            <button className={PRIMARY_BUTTON_CLASS} disabled={loading} type="submit">
              Aplicar filtros
            </button>
          </div>
        </form>

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

        <section aria-label="Lista de projetos DevOps">
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Projetos encontrados', result?.meta.total ?? 0],
              ['Tarefas nesta página', visibleSummary.taskCount],
              ['Progresso médio', `${visibleSummary.averageProgress}%`],
              ['Projetos bloqueados', visibleSummary.blockedCount],
            ].map(([label, value]) => (
              <div
                className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10"
                key={label}
              >
                <span className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-app-muted">
                  {label}
                </span>
                <strong className="mt-2 block text-2xl text-app-text">{value}</strong>
              </div>
            ))}
          </div>

          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {(result?.data ?? []).map((project) => (
              <li
                className="group rounded-xl border border-app-border bg-app-surface shadow-sm shadow-slate-950/5 transition hover:border-app-border-strong hover:shadow-md dark:shadow-black/10"
                key={project.id}
              >
                <div className="grid gap-4 p-4 lg:grid-cols-[minmax(260px,1.5fr)_minmax(160px,.75fr)_minmax(180px,.8fr)_minmax(220px,1fr)_auto] lg:items-center">
                  <div className="min-w-0 lg:border-r lg:border-app-border-soft lg:pr-4">
                    <Link
                      className="text-xs font-extrabold text-app-brand no-underline hover:underline focus-visible:underline"
                      href={`/atendimentos/devops/projetos/${project.id}`}
                    >
                      Projeto #{project.id}
                    </Link>
                    <h2 className="mt-1 truncate text-lg font-extrabold text-app-text">
                      {project.name || 'Sem nome'}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-app-muted-strong">
                      {project.openingDescription || project.category.name || 'Sem descrição cadastrada.'}
                    </p>
                  </div>

                  <dl className="contents text-sm">
                    <div className="min-w-0">
                      <dt className="text-[11px] font-extrabold uppercase tracking-wide text-app-muted">Cliente</dt>
                      <dd className="mt-1 truncate font-semibold text-app-text-soft">{project.client.name || '—'}</dd>
                      <dd className="mt-1 truncate text-xs text-app-muted">{project.technician.name || 'Não atribuído'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-extrabold uppercase tracking-wide text-app-muted">Tarefas</dt>
                      <dd className="mt-1 font-semibold text-app-text-soft">{project.tasks.completed} de {project.tasks.total} concluídas</dd>
                      <dd className="mt-1 text-xs text-app-muted">
                        {project.tasks.inProgress} em execução · {project.tasks.onHold} em espera
                      </dd>
                    </div>
                  </dl>

                  <div className="min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-extrabold ${projectStatusClass(project.status)}`}>
                        {project.statusLabel}
                      </span>
                      <strong className="text-app-text">{project.tasks.progressPercent}%</strong>
                    </div>
                    <div
                      aria-label={`${project.tasks.progressPercent}% concluído`}
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={project.tasks.progressPercent}
                      className="h-2.5 overflow-hidden rounded-full bg-app-border"
                      role="progressbar"
                    >
                      <div
                        className={`h-full rounded-full transition-all ${project.tasks.blocked > 0 ? 'bg-amber-500' : 'bg-app-brand'}`}
                        style={{ width: `${project.tasks.progressPercent}%` }}
                      />
                    </div>
                    <span className="mt-1.5 block truncate text-[11px] text-app-muted">
                      Atualizado {formatDate(project.lastActivityAt)}
                    </span>
                  </div>

                  <Link
                    className={`${BUTTON_CLASS} w-full lg:w-auto`}
                    href={`/atendimentos/devops/projetos/${project.id}`}
                  >
                    Abrir
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {!loading && !error && result?.data.length === 0 ? (
            <div className="px-5 py-10 text-center text-app-muted-strong">
              Nenhum projeto DevOps encontrado com os filtros atuais.
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3.5 shadow-sm shadow-slate-950/5 max-sm:flex-col max-sm:items-stretch dark:shadow-black/10">
            <span className="text-[13px] text-app-muted-strong">
              Página {page}{totalPages > 0 ? ` de ${totalPages}` : ''}
            </span>
            <div className="flex gap-2 max-sm:[&>*]:flex-1">
              <button
                className={BUTTON_CLASS}
                disabled={loading || page <= 1}
                onClick={() =>
                  setQuery((current) => ({ ...current, page: Math.max(1, current.page - 1) }))
                }
                type="button"
              >
                Anterior
              </button>
              <button
                className={BUTTON_CLASS}
                disabled={loading || totalPages === 0 || page >= totalPages}
                onClick={() =>
                  setQuery((current) => ({ ...current, page: current.page + 1 }))
                }
                type="button"
              >
                Próxima
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

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
const TABLE_CELL_CLASS =
  'border-b border-app-border-soft px-3 py-3 align-top text-left text-[13px]';
const TABLE_HEADER_CLASS =
  'sticky top-0 border-b border-app-border-soft bg-app-surface-muted px-3 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-app-muted';

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
        subtitle="Grupos opcionais de tarefas DevOps. Tarefas avulsas continuam fora de projeto."
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

        <section
          className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm shadow-slate-950/5 dark:shadow-black/10"
          aria-label="Lista de projetos DevOps"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr>
                  <th className={TABLE_HEADER_CLASS}>ID</th>
                  <th className={TABLE_HEADER_CLASS}>Projeto</th>
                  <th className={TABLE_HEADER_CLASS}>Cliente</th>
                  <th className={TABLE_HEADER_CLASS}>Técnico</th>
                  <th className={TABLE_HEADER_CLASS}>Status</th>
                  <th className={TABLE_HEADER_CLASS}>Abertura</th>
                </tr>
              </thead>
              <tbody>
                {(result?.data ?? []).map((project) => (
                  <tr className="transition-colors hover:bg-app-surface-muted" key={project.id}>
                    <td className={`${TABLE_CELL_CLASS} font-extrabold`}>
                      <Link
                        className="font-extrabold text-app-brand no-underline hover:underline focus-visible:underline"
                        href={`/atendimentos/devops/projetos/${project.id}`}
                      >
                        #{project.id}
                      </Link>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <div className="grid min-w-[220px] gap-0.5">
                        <strong className="text-app-text">{project.name || 'Sem nome'}</strong>
                        <span className="max-w-[420px] truncate text-app-muted-strong">
                          {project.openingDescription || project.category.name || 'Sem descrição'}
                        </span>
                      </div>
                    </td>
                    <td className={TABLE_CELL_CLASS}>{project.client.name || '—'}</td>
                    <td className={TABLE_CELL_CLASS}>{project.technician.name || 'Não atribuído'}</td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className="inline-flex items-center rounded-full bg-app-surface-muted px-2 py-1 text-xs font-extrabold whitespace-nowrap text-app-text-soft">
                        {project.statusLabel}
                      </span>
                    </td>
                    <td className={TABLE_CELL_CLASS}>{formatDate(project.openedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && !error && result?.data.length === 0 ? (
            <div className="px-5 py-10 text-center text-app-muted-strong">
              Nenhum projeto DevOps encontrado com os filtros atuais.
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 px-4 py-3.5 max-sm:flex-col max-sm:items-stretch">
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

"use client";

import type {
  TicketProjectFlowTemplate,
  TicketProjectTaskListItem,
} from '@helpdesk/contracts';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { updateDevOpsTaskDependency } from '../api/modular-ticket-edit-api';
import {
  applyProjectFlowTemplate,
  fetchProjectFlowTemplates,
} from '../api/project-flow-template-api';

const FIELD_CLASS =
  'min-h-9 w-full rounded-lg border border-app-border-strong bg-app-surface px-2.5 text-xs text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';
const BUTTON_CLASS =
  'inline-flex min-h-9 items-center justify-center rounded-lg border border-app-brand bg-app-brand px-3 text-xs font-extrabold text-white transition hover:bg-app-brand-hover disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-950';

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const message = (reason.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(' ');
  }
  if (reason instanceof ApiError) return `A API respondeu com erro ${reason.status}.`;
  return reason instanceof Error ? reason.message : 'Não foi possível atualizar o fluxo.';
}

function statusClass(task: TicketProjectTaskListItem): string {
  if (task.status === 4) return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (task.blockedByDependency) return 'border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  if (task.status === 2) return 'border-app-brand bg-[var(--app-brand-soft)] text-app-brand';
  return 'border-app-border bg-app-surface-muted text-app-text-soft';
}

function buildStages(tasks: TicketProjectTaskListItem[]): TicketProjectTaskListItem[][] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const levels = new Map<number, number>();

  function levelOf(task: TicketProjectTaskListItem, trail: Set<number>): number {
    const cached = levels.get(task.id);
    if (cached !== undefined) return cached;
    if (trail.has(task.id)) return 0;

    const dependency = byId.get(task.dependencyTaskId);
    if (!dependency) {
      levels.set(task.id, 0);
      return 0;
    }

    const nextTrail = new Set(trail);
    nextTrail.add(task.id);
    const level = Math.min(levelOf(dependency, nextTrail) + 1, tasks.length);
    levels.set(task.id, level);
    return level;
  }

  const stages: TicketProjectTaskListItem[][] = [];
  [...tasks]
    .sort((left, right) => left.id - right.id)
    .forEach((task) => {
      const level = levelOf(task, new Set());
      (stages[level] ??= []).push(task);
    });

  return stages.filter(Boolean);
}

function FlowTaskCard({
  editable,
  onChanged,
  options,
  task,
}: {
  editable: boolean;
  onChanged: () => void;
  options: TicketProjectTaskListItem[];
  task: TicketProjectTaskListItem;
}) {
  const [selected, setSelected] = useState(String(task.dependencyTaskId));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setSelected(String(task.dependencyTaskId));
  }, [task.dependencyTaskId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await updateDevOpsTaskDependency(task.id, {
        dependencyTaskId: Number(selected),
      });
      setFeedback('Etapa anterior atualizada.');
      onChanged();
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="w-[270px] rounded-xl border border-app-border bg-app-surface p-3.5 shadow-sm shadow-slate-950/5 dark:shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            className="text-xs font-extrabold text-app-brand no-underline hover:underline"
            href={`/atendimentos/devops/${task.id}`}
          >
            Tarefa #{task.id}
          </Link>
          <h3 className="mt-1 line-clamp-2 text-sm font-extrabold text-app-text">
            {task.name || 'Sem nome'}
          </h3>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-extrabold ${statusClass(task)}`}>
          {task.blockedByDependency ? 'Bloqueada' : task.statusLabel}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-app-border">
        <div
          className="h-full rounded-full bg-app-brand"
          style={{ width: `${task.progressPercent}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-bold text-app-muted">
        <span>{task.technician.name || 'Não atribuído'}</span>
        <span>{task.progressPercent}%</span>
      </div>

      <form className="mt-3 border-t border-app-border-soft pt-3" onSubmit={submit}>
        <label className="grid gap-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-app-muted">
            Etapa anterior
          </span>
          <select
            className={FIELD_CLASS}
            disabled={!editable || saving}
            onChange={(event) => setSelected(event.target.value)}
            value={selected}
          >
            <option value="0">Início do projeto</option>
            {options
              .filter((candidate) => candidate.id !== task.id)
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  #{candidate.id} · {candidate.name || 'Sem nome'}
                </option>
              ))}
          </select>
        </label>
        {feedback ? (
          <p className="mb-0 mt-2 text-[11px] text-app-muted-strong" role="status">
            {feedback}
          </p>
        ) : null}
        {editable ? (
          <button
            className={`${BUTTON_CLASS} mt-2 w-full`}
            disabled={saving || Number(selected) === task.dependencyTaskId}
            type="submit"
          >
            {saving ? 'Salvando…' : 'Aplicar no fluxo'}
          </button>
        ) : null}
      </form>
    </article>
  );
}

export function DevOpsProjectFlowchart({
  editable,
  onChanged,
  projectId,
  tasks,
}: {
  editable: boolean;
  onChanged: () => void;
  projectId: number;
  tasks: TicketProjectTaskListItem[];
}) {
  const stages = useMemo(() => buildStages(tasks), [tasks]);
  const startCount = stages[0]?.length ?? 0;
  const [templates, setTemplates] = useState<TicketProjectFlowTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!editable) return;
    const controller = new AbortController();
    fetchProjectFlowTemplates(controller.signal)
      .then((response) => setTemplates(response.data))
      .catch((reason: unknown) => {
        if (!(reason instanceof Error && reason.name === 'AbortError')) {
          setApplyFeedback(errorMessage(reason));
        }
      });
    return () => controller.abort();
  }, [editable]);

  async function applyTemplate() {
    const selected = templates.find((template) => template.id === Number(templateId));
    if (!selected) return;
    if (!window.confirm(`Aplicar “${selected.name}” e criar ${selected.steps.length} tarefa(s) neste projeto?`)) return;
    setApplying(true);
    setApplyFeedback(null);
    try {
      const result = await applyProjectFlowTemplate(projectId, selected.id);
      setTemplateId('');
      setApplyFeedback(`${result.createdTaskIds.length} tarefa(s) criadas pelo template “${selected.name}”.`);
      onChanged();
    } catch (reason) {
      setApplyFeedback(errorMessage(reason));
    } finally {
      setApplying(false);
    }
  }

  return (
    <section
      aria-label="Fluxograma do projeto"
      className="mb-4 overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm shadow-slate-950/5 dark:shadow-black/10"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-app-border-soft p-5">
        <div className="max-w-3xl">
          <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
            Padronização do projeto
          </span>
          <h2 className="mb-0 mt-1 text-lg font-extrabold text-app-text">
            Fluxo do início ao fim
          </h2>
          <p className="mb-0 mt-1.5 text-sm leading-6 text-app-muted-strong">
            Defina a etapa anterior de cada tarefa. Tarefas com a mesma etapa ficam em paralelo;
            as dependências controlam quando cada execução será liberada.
          </p>
        </div>
        {editable ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              className={BUTTON_CLASS}
              href="/atendimentos/devops/fluxos"
            >
              Gerenciar templates
            </Link>
            <Link
              className={BUTTON_CLASS}
              href={`/atendimentos/devops/nova-tarefa?projectId=${projectId}`}
            >
              Adicionar etapa
            </Link>
          </div>
        ) : null}
      </header>

      {editable ? (
        <div className="grid gap-3 border-b border-app-border-soft bg-[var(--app-brand-soft)] p-4 md:grid-cols-[minmax(240px,1fr)_auto] md:items-end">
          <label className="grid gap-1.5">
            <span className="text-xs font-extrabold text-app-brand">Aplicar um template pronto</span>
            <select
              className={FIELD_CLASS}
              disabled={applying || templates.length === 0}
              onChange={(event) => setTemplateId(event.target.value)}
              value={templateId}
            >
              <option value="">{templates.length === 0 ? 'Nenhum template disponível' : 'Selecione um fluxo'}</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · {template.steps.length} etapa(s)
                </option>
              ))}
            </select>
          </label>
          <button
            className={BUTTON_CLASS}
            disabled={applying || !templateId}
            onClick={applyTemplate}
            type="button"
          >
            {applying ? 'Aplicando…' : 'Usar template'}
          </button>
          {applyFeedback ? (
            <p className="m-0 text-xs font-semibold text-app-text-soft md:col-span-2" role="status">
              {applyFeedback}
            </p>
          ) : null}
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <div className="grid justify-items-center gap-3 px-5 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-[var(--app-brand-soft)] text-xl font-black text-app-brand">
            +
          </span>
          <strong className="text-app-text">O fluxo ainda não possui etapas</strong>
          <p className="m-0 max-w-lg text-sm text-app-muted-strong">
            Crie a primeira tarefa para iniciar a padronização deste projeto.
          </p>
        </div>
      ) : (
        <>
          <div className="border-b border-app-border-soft bg-app-surface-muted px-5 py-3 text-xs text-app-muted-strong">
            {stages.length} etapa{stages.length === 1 ? '' : 's'} · {tasks.length} tarefa{tasks.length === 1 ? '' : 's'}
            {startCount > 1 ? ` · ${startCount} tarefas iniciam em paralelo` : ''}
          </div>
          <div className="overflow-x-auto p-5">
            <div className="flex min-w-max items-stretch gap-4" role="list">
              <div className="flex w-28 shrink-0 items-center" role="listitem">
                <div className="w-full rounded-xl border-2 border-emerald-500 bg-emerald-500/10 px-3 py-4 text-center text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Início
                </div>
              </div>

              {stages.map((stage, index) => (
                <div className="flex items-stretch gap-4" key={stage.map((task) => task.id).join('-')} role="listitem">
                  <div aria-hidden="true" className="flex w-8 items-center justify-center text-2xl text-app-muted">→</div>
                  <div className="rounded-xl border border-dashed border-app-border-strong bg-app-bg/60 p-3">
                    <div className="mb-2 flex items-center justify-between gap-4 px-1">
                      <strong className="text-xs uppercase tracking-wider text-app-muted">
                        Etapa {index + 1}
                      </strong>
                      <span className="text-[10px] text-app-muted">{stage.length > 1 ? 'Execução paralela' : 'Sequencial'}</span>
                    </div>
                    <div className="grid gap-3">
                      {stage.map((task) => (
                        <FlowTaskCard
                          editable={editable}
                          key={task.id}
                          onChanged={onChanged}
                          options={tasks}
                          task={task}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <div aria-hidden="true" className="flex w-8 items-center justify-center text-2xl text-app-muted">→</div>
              <div className="flex w-28 shrink-0 items-center" role="listitem">
                <div className="w-full rounded-xl border-2 border-app-brand bg-[var(--app-brand-soft)] px-3 py-4 text-center text-xs font-black uppercase tracking-wider text-app-brand">
                  Fim
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

"use client";

import {
  AppPermission,
  type CurrentUserResponse,
  type TicketProjectFlowTemplate,
  type TicketProjectFlowTemplateWriteRequest,
} from '@helpdesk/contracts';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import {
  createProjectFlowTemplate,
  deleteProjectFlowTemplate,
  fetchProjectFlowTemplates,
  updateProjectFlowTemplate,
} from '../api/project-flow-template-api';

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_BUTTON_CLASS = `${BUTTON_CLASS} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;
const DANGER_BUTTON_CLASS = `${BUTTON_CLASS} border-app-danger-border text-app-danger hover:bg-app-danger-soft`;
const FIELD_CLASS =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';

type DraftStep = TicketProjectFlowTemplateWriteRequest['steps'][number];

interface Draft {
  name: string;
  description: string;
  steps: DraftStep[];
}

let nextStepId = 1;

function stepKey(): string {
  nextStepId += 1;
  return `step-${Date.now()}-${nextStepId}`;
}

function emptyDraft(): Draft {
  return {
    name: '',
    description: '',
    steps: [
      {
        key: stepKey(),
        name: '',
        description: '',
        durationDays: 1,
        dependsOnKey: null,
      },
    ],
  };
}

function templateDraft(template: TicketProjectFlowTemplate): Draft {
  return {
    name: template.name,
    description: template.description,
    steps: template.steps.map(({ sortOrder: _sortOrder, ...step }) => step),
  };
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const message = (reason.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(' ');
  }
  if (reason instanceof ApiError) return `A API respondeu com erro ${reason.status}.`;
  return reason instanceof Error ? reason.message : 'Não foi possível concluir a operação.';
}

export function DevOpsFlowTemplatesScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [templates, setTemplates] = useState<TicketProjectFlowTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canManage = currentUser.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.DevOpsProjectsEdit,
  );

  async function reload(signal?: AbortSignal) {
    const response = await fetchProjectFlowTemplates(signal);
    setTemplates(response.data);
    return response.data;
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    reload(controller.signal)
      .catch((reason: unknown) => {
        if (!(reason instanceof Error && reason.name === 'AbortError')) {
          setFeedback(errorMessage(reason));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const selected = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? null,
    [selectedId, templates],
  );

  function selectTemplate(template: TicketProjectFlowTemplate) {
    setSelectedId(template.id);
    setDraft(templateDraft(template));
    setFeedback(null);
  }

  function newTemplate() {
    setSelectedId(null);
    setDraft(emptyDraft());
    setFeedback(null);
  }

  function updateStep(key: string, values: Partial<DraftStep>) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.key === key ? { ...step, ...values } : step,
      ),
    }));
  }

  function addStep() {
    setDraft((current) => ({
      ...current,
      steps: [
        ...current.steps,
        {
          key: stepKey(),
          name: '',
          description: '',
          durationDays: 1,
          dependsOnKey: current.steps.at(-1)?.key ?? null,
        },
      ],
    }));
  }

  function removeStep(key: string) {
    setDraft((current) => ({
      ...current,
      steps: current.steps
        .filter((step) => step.key !== key)
        .map((step) => ({
          ...step,
          dependsOnKey: step.dependsOnKey === key ? null : step.dependsOnKey,
        })),
    }));
  }

  function moveStep(index: number, offset: -1 | 1) {
    setDraft((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.steps.length) return current;
      const steps = [...current.steps];
      const [step] = steps.splice(index, 1);
      if (!step) return current;
      steps.splice(target, 0, step);
      return { ...current, steps };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const input: TicketProjectFlowTemplateWriteRequest = {
        name: draft.name,
        description: draft.description,
        steps: draft.steps,
      };
      const saved = selectedId
        ? await updateProjectFlowTemplate(selectedId, input)
        : await createProjectFlowTemplate(input);
      const items = await reload();
      const refreshed = items.find((item) => item.id === saved.id) ?? saved;
      setSelectedId(refreshed.id);
      setDraft(templateDraft(refreshed));
      setFeedback('Template salvo com sucesso.');
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selected || !window.confirm(`Arquivar o template “${selected.name}”?`)) return;
    setSaving(true);
    setFeedback(null);
    try {
      await deleteProjectFlowTemplate(selected.id);
      await reload();
      newTemplate();
      setFeedback('Template arquivado.');
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          <Link className={BUTTON_CLASS} href="/atendimentos/devops/projetos">
            Voltar aos projetos
          </Link>
        }
        subtitle="Crie padrões reutilizáveis de tarefas e dependências para projetos DevOps."
        title="Fluxos de projetos"
        user={currentUser}
      />

      <div className="mx-auto grid w-full max-w-[1500px] gap-4 px-6 py-6 lg:grid-cols-[320px_minmax(0,1fr)] max-sm:px-3.5">
        <aside className="self-start overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm shadow-slate-950/5 dark:shadow-black/10">
          <div className="flex items-center justify-between gap-3 border-b border-app-border-soft p-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-app-muted">Biblioteca</span>
              <strong className="mt-1 block text-lg text-app-text">Templates</strong>
            </div>
            {canManage ? (
              <button className={PRIMARY_BUTTON_CLASS} onClick={newTemplate} type="button">
                Novo
              </button>
            ) : null}
          </div>
          <div className="grid max-h-[calc(100vh-220px)] gap-1 overflow-y-auto p-2">
            {templates.map((template) => (
              <button
                className={`rounded-lg px-3 py-3 text-left transition ${selectedId === template.id ? 'bg-[var(--app-brand-soft)] text-app-brand' : 'hover:bg-app-surface-hover'}`}
                key={template.id}
                onClick={() => selectTemplate(template)}
                type="button"
              >
                <strong className="block truncate text-sm">{template.name}</strong>
                <span className="mt-1 block text-xs text-app-muted-strong">
                  {template.steps.length} etapa{template.steps.length === 1 ? '' : 's'}
                </span>
              </button>
            ))}
            {!loading && templates.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-app-muted">Nenhum template cadastrado.</p>
            ) : null}
          </div>
        </aside>

        <form className="min-w-0" onSubmit={submit}>
          {feedback ? (
            <div className="mb-4 rounded-lg border border-app-border bg-app-surface-muted px-4 py-3 text-sm text-app-text-soft" role="status">
              {feedback}
            </div>
          ) : null}

          <section className="mb-4 rounded-xl border border-app-border bg-app-surface p-5 shadow-sm shadow-slate-950/5 dark:shadow-black/10">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-extrabold text-app-muted">Nome do template</span>
                <input
                  className={FIELD_CLASS}
                  disabled={!canManage || saving}
                  maxLength={160}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ex.: Implantação de novo cliente"
                  required
                  value={draft.name}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-extrabold text-app-muted">Descrição</span>
                <input
                  className={FIELD_CLASS}
                  disabled={!canManage || saving}
                  maxLength={5000}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Quando este fluxo deve ser utilizado"
                  value={draft.description}
                />
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm shadow-slate-950/5 dark:shadow-black/10">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft p-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-app-muted">Fluxograma</span>
                <h2 className="mb-0 mt-1 text-lg font-extrabold text-app-text">Etapas do template</h2>
              </div>
              {canManage ? (
                <button className={BUTTON_CLASS} onClick={addStep} type="button">Adicionar etapa</button>
              ) : null}
            </div>

            <ol className="m-0 grid list-none gap-0 p-0">
              {draft.steps.map((step, index) => (
                <li className="border-b border-app-border-soft p-4 last:border-b-0" key={step.key}>
                  <div className="grid gap-3 xl:grid-cols-[48px_minmax(180px,1fr)_minmax(220px,1.4fr)_180px_110px_auto] xl:items-end">
                    <div className="grid size-10 place-items-center rounded-full bg-[var(--app-brand-soft)] text-sm font-black text-app-brand">
                      {index + 1}
                    </div>
                    <label className="grid gap-1.5">
                      <span className="text-xs font-bold text-app-muted">Nome da etapa</span>
                      <input
                        className={FIELD_CLASS}
                        disabled={!canManage || saving}
                        maxLength={160}
                        onChange={(event) => updateStep(step.key, { name: event.target.value })}
                        required
                        value={step.name}
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-xs font-bold text-app-muted">Descrição padrão</span>
                      <input
                        className={FIELD_CLASS}
                        disabled={!canManage || saving}
                        maxLength={10000}
                        onChange={(event) => updateStep(step.key, { description: event.target.value })}
                        value={step.description}
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-xs font-bold text-app-muted">Etapa anterior</span>
                      <select
                        className={FIELD_CLASS}
                        disabled={!canManage || saving}
                        onChange={(event) => updateStep(step.key, { dependsOnKey: event.target.value || null })}
                        value={step.dependsOnKey ?? ''}
                      >
                        <option value="">Início do projeto</option>
                        {draft.steps.filter((candidate) => candidate.key !== step.key).map((candidate, candidateIndex) => (
                          <option key={candidate.key} value={candidate.key}>
                            {candidateIndex + 1}. {candidate.name || 'Etapa sem nome'}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-xs font-bold text-app-muted">Dias</span>
                      <input
                        className={FIELD_CLASS}
                        disabled={!canManage || saving}
                        max={3650}
                        min={0}
                        onChange={(event) => updateStep(step.key, { durationDays: Number(event.target.value) })}
                        type="number"
                        value={step.durationDays}
                      />
                    </label>
                    {canManage ? (
                      <div className="flex gap-1">
                        <button aria-label="Mover etapa para cima" className={BUTTON_CLASS} disabled={index === 0} onClick={() => moveStep(index, -1)} type="button">↑</button>
                        <button aria-label="Mover etapa para baixo" className={BUTTON_CLASS} disabled={index === draft.steps.length - 1} onClick={() => moveStep(index, 1)} type="button">↓</button>
                        <button aria-label="Remover etapa" className={DANGER_BUTTON_CLASS} disabled={draft.steps.length === 1} onClick={() => removeStep(step.key)} type="button">×</button>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {canManage ? (
            <div className="sticky bottom-0 mt-4 flex flex-wrap justify-end gap-2 rounded-xl border border-app-border bg-app-surface/95 p-3 shadow-lg backdrop-blur">
              {selected ? (
                <button className={DANGER_BUTTON_CLASS} disabled={saving} onClick={remove} type="button">Arquivar</button>
              ) : null}
              <button className={PRIMARY_BUTTON_CLASS} disabled={saving} type="submit">
                {saving ? 'Salvando…' : selected ? 'Salvar alterações' : 'Criar template'}
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </main>
  );
}

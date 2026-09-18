"use client";

import type { TicketProjectTaskListItem } from '@helpdesk/contracts';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { updateDevOpsTaskDependency } from '../api/modular-ticket-edit-api';

const CARD_CLASS =
  'mb-4 rounded-[14px] border border-app-border bg-app-surface p-[1.15rem] shadow-sm shadow-slate-950/5 dark:shadow-black/10';
const FIELD_CONTROL_CLASS =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';
const PRIMARY_BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-app-brand bg-app-brand px-4 text-sm font-bold text-white transition-colors hover:bg-app-brand-hover disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-950';

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const message = (reason.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(' ');
  }
  if (reason instanceof ApiError) return `A API respondeu com erro ${reason.status}.`;
  return reason instanceof Error ? reason.message : 'Não foi possível alterar a dependência.';
}

export function DevOpsTaskDependencyEditor({
  dependencyTaskId,
  onChanged,
  options,
  projectId,
  ticketId,
}: {
  dependencyTaskId: number;
  onChanged: () => void;
  options: TicketProjectTaskListItem[];
  projectId: number | null;
  ticketId: number;
}) {
  const [selected, setSelected] = useState(String(dependencyTaskId));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setSelected(String(dependencyTaskId));
  }, [dependencyTaskId]);

  const candidates = useMemo(
    () => options.filter((task) => task.id !== ticketId),
    [options, ticketId],
  );
  const current = candidates.find((task) => task.id === dependencyTaskId);
  const currentLabel = dependencyTaskId <= 0
    ? 'Sem dependência'
    : current?.name || `#${dependencyTaskId}`;

  if (!projectId) {
    return (
      <section className={CARD_CLASS} aria-label="Dependência da tarefa DevOps">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
              Estrutura DevOps
            </span>
            <h2 className="m-0 text-[1.05rem] font-bold text-app-text">
              Dependência
            </h2>
            <p className="mt-1.5 text-sm text-app-muted">
              Tickets avulsos não participam da cadeia de dependências de projeto.
            </p>
          </div>
        </div>
      </section>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await updateDevOpsTaskDependency(ticketId, {
        dependencyTaskId: Number(selected),
      });
      setFeedback('Dependência atualizada.');
      onChanged();
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={CARD_CLASS} aria-label="Dependência da tarefa DevOps">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
            Estrutura DevOps
          </span>
          <h2 className="m-0 text-[1.05rem] font-bold text-app-text">
            Dependência da tarefa
          </h2>
          <p className="mt-1.5 text-sm text-app-muted">
            Atual: {currentLabel}. O backend valida mesmo projeto e impede ciclos.
          </p>
        </div>
      </div>

      {feedback ? (
        <div
          className="mb-3.5 whitespace-pre-wrap rounded-lg border border-app-border bg-app-surface-muted px-3 py-2.5 text-sm text-app-text-soft"
          role="status"
        >
          {feedback}
        </div>
      ) : null}

      <form onSubmit={submit}>
        <div className="grid gap-3 md:max-w-2xl">
          <label className="grid min-w-0 gap-1.5">
            <span className="text-xs font-bold tracking-[0.02em] text-app-muted">
              Depende de
            </span>
            <select
              className={FIELD_CONTROL_CLASS}
              disabled={saving}
              onChange={(event) => setSelected(event.target.value)}
              value={selected}
            >
              <option value="0">Sem dependência</option>
              {dependencyTaskId > 0 && !current ? (
                <option value={dependencyTaskId}>
                  #{dependencyTaskId} · dependência atual
                </option>
              ) : null}
              {candidates.map((task) => (
                <option key={task.id} value={task.id}>
                  #{task.id} · {task.name || 'Sem nome'} · {task.statusLabel}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2.5">
          <button
            className={PRIMARY_BUTTON_CLASS}
            disabled={saving || Number(selected) === dependencyTaskId}
            type="submit"
          >
            {saving ? 'Salvando…' : 'Salvar dependência'}
          </button>
        </div>
      </form>
    </section>
  );
}

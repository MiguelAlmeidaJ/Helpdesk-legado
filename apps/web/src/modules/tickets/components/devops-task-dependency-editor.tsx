"use client";

import type { TicketProjectTaskListItem } from '@helpdesk/contracts';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { updateDevOpsTaskDependency } from '../api/modular-ticket-edit-api';
import styles from './specialized-ticket-classification-editor.module.css';

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
      <section className={styles.card}>
        <div className={styles.header}>
          <div>
            <span className="eyebrow">Estrutura DevOps</span>
            <h2>Dependência</h2>
            <p>Tickets avulsos não participam da cadeia de dependências de projeto.</p>
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
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <span className="eyebrow">Estrutura DevOps</span>
          <h2>Dependência da tarefa</h2>
          <p>Atual: {currentLabel}. O backend valida mesmo projeto e impede ciclos.</p>
        </div>
      </div>

      {feedback ? <div className={styles.feedback}>{feedback}</div> : null}

      <form onSubmit={submit}>
        <div className={styles.grid}>
          <label>
            <span>Depende de</span>
            <select disabled={saving} onChange={(event) => setSelected(event.target.value)} value={selected}>
              <option value="0">Sem dependência</option>
              {dependencyTaskId > 0 && !current ? (
                <option value={dependencyTaskId}>#{dependencyTaskId} · dependência atual</option>
              ) : null}
              {candidates.map((task) => (
                <option key={task.id} value={task.id}>
                  #{task.id} · {task.name || 'Sem nome'} · {task.statusLabel}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.actions}>
          <button className="button button-primary" disabled={saving || Number(selected) === dependencyTaskId} type="submit">
            {saving ? 'Salvando…' : 'Salvar dependência'}
          </button>
        </div>
      </form>
    </section>
  );
}

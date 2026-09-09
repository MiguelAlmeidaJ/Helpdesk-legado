"use client";

import type { TicketCatalogOption } from '@helpdesk/contracts';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import styles from './specialized-ticket-workflow-panel.module.css';

export interface SpecializedWorkflowActions {
  interaction: (description: string) => Promise<void>;
  assignment: (technicianId: number) => Promise<void>;
  hold: (forecastAt: string, description: string) => Promise<void>;
  resume: () => Promise<void>;
  reject: (technicianId: number, reason: string) => Promise<void>;
  finalize: (description: string) => Promise<void>;
  progress?: (progress: number) => Promise<void>;
}

interface Props {
  resourceLabel: string;
  status: number;
  statusLabel: string;
  currentUser: { id: number; name: string };
  assignedTechnicianId: number | null;
  technicians: TicketCatalogOption[];
  actions: SpecializedWorkflowActions;
  onChanged: () => void | Promise<void>;
}

function localDateTime(): string {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return now.toISOString().slice(0, 16);
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const message = (reason.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.map(String).join(' ');
  }
  if (reason instanceof ApiError) return `A API respondeu com erro ${reason.status}.`;
  if (reason instanceof Error) return reason.message;
  return 'Não foi possível concluir a operação.';
}

export function SpecializedTicketWorkflowPanel({
  resourceLabel,
  status,
  statusLabel,
  currentUser,
  assignedTechnicianId,
  technicians,
  actions,
  onChanged,
}: Props) {
  const normalizedTechnicians = useMemo(() => {
    const result = technicians.filter((option) => option.id > 0);
    if (!result.some((option) => option.id === currentUser.id)) {
      result.unshift({ id: currentUser.id, name: `${currentUser.name} (eu)` });
    }
    return result;
  }, [currentUser.id, currentUser.name, technicians]);

  const [interaction, setInteraction] = useState('');
  const [assignmentId, setAssignmentId] = useState(
    String(assignedTechnicianId && assignedTechnicianId > 0 ? assignedTechnicianId : currentUser.id),
  );
  const [holdAt, setHoldAt] = useState(localDateTime);
  const [holdDescription, setHoldDescription] = useState('');
  const [rejectId, setRejectId] = useState('0');
  const [rejectReason, setRejectReason] = useState('');
  const [finalDescription, setFinalDescription] = useState('');
  const [progress, setProgress] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);

  async function run(success: string, operation: () => Promise<void>) {
    setBusy(true);
    setFeedback(null);
    try {
      await operation();
      setFeedback({ text: success, error: false });
      await onChanged();
    } catch (reason) {
      setFeedback({ text: errorMessage(reason), error: true });
    } finally {
      setBusy(false);
    }
  }

  function submitInteraction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = interaction.trim();
    if (!description) return;
    void run('Interação registrada.', async () => {
      await actions.interaction(description);
      setInteraction('');
    });
  }

  function submitHold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = holdDescription.trim();
    if (!description || !holdAt) return;
    void run('Registro colocado em espera.', async () => {
      await actions.hold(holdAt, description);
      setHoldDescription('');
    });
  }

  function submitReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = rejectReason.trim();
    if (!reason) return;
    void run('Recusa/redirecionamento registrado.', async () => {
      await actions.reject(Number(rejectId), reason);
      setRejectReason('');
    });
  }

  function submitFinalize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = finalDescription.trim();
    if (!description) return;
    void run('Registro finalizado.', async () => {
      await actions.finalize(description);
      setFinalDescription('');
    });
  }

  function submitProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actions.progress || progress === '') return;
    const value = Number(progress);
    if (!Number.isSafeInteger(value) || value < 0 || value > 100) {
      setFeedback({ text: 'O progresso deve ser um inteiro entre 0 e 100.', error: true });
      return;
    }
    void run(`Progresso atualizado para ${value}%.`, () => actions.progress!(value));
  }

  return (
    <section className={styles.card} aria-label={`Ações de ${resourceLabel}`}>
      <div className={styles.header}>
        <div>
          <span className="eyebrow">Operação</span>
          <h2>Ações do {resourceLabel}</h2>
          <p>As permissões e transições válidas continuam sendo decididas pela API.</p>
        </div>
        <span className="status-pill">{statusLabel}</span>
      </div>

      {feedback ? (
        <div className={styles.feedback} data-error={feedback.error} role="status">
          {feedback.text}
        </div>
      ) : null}

      <div className={styles.grid}>
        <details className={styles.action} open>
          <summary>Adicionar interação</summary>
          <form className={styles.form} onSubmit={submitInteraction}>
            <label>
              <span>Descrição</span>
              <textarea disabled={busy} maxLength={10_000} onChange={(event) => setInteraction(event.target.value)} required rows={4} value={interaction} />
            </label>
            <button className="button button-primary" disabled={busy || !interaction.trim()} type="submit">Registrar interação</button>
          </form>
        </details>

        {status === 1 ? (
          <details className={styles.action} open>
            <summary>Iniciar ou direcionar</summary>
            <div className={styles.form}>
              <label>
                <span>Técnico</span>
                <select disabled={busy} onChange={(event) => setAssignmentId(event.target.value)} value={assignmentId}>
                  {normalizedTechnicians.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
              <div className={styles.inlineActions}>
                <button className="button button-primary" disabled={busy} onClick={() => void run('Ticket iniciado para o usuário atual.', () => actions.assignment(currentUser.id))} type="button">Iniciar comigo</button>
                <button className="button" disabled={busy || Number(assignmentId) < 1} onClick={() => void run('Direcionamento registrado.', () => actions.assignment(Number(assignmentId)))} type="button">Direcionar</button>
              </div>
              <span className={styles.muted}>Se o escopo não permitir atuar neste registro, a API recusará a operação.</span>
            </div>
          </details>
        ) : null}

        {status === 2 ? (
          <details className={styles.action}>
            <summary>Colocar em espera</summary>
            <form className={styles.form} onSubmit={submitHold}>
              <label><span>Previsão de retorno</span><input disabled={busy} onChange={(event) => setHoldAt(event.target.value)} required type="datetime-local" value={holdAt} /></label>
              <label><span>Motivo</span><textarea disabled={busy} maxLength={10_000} onChange={(event) => setHoldDescription(event.target.value)} required rows={3} value={holdDescription} /></label>
              <button className="button" disabled={busy || !holdDescription.trim()} type="submit">Colocar em espera</button>
            </form>
          </details>
        ) : null}

        {status === 3 ? (
          <details className={styles.action} open>
            <summary>Retomar execução</summary>
            <div className={styles.form}>
              <p>Encerra a espera ativa e devolve o registro para execução.</p>
              <button className="button button-primary" disabled={busy} onClick={() => void run('Registro retomado.', actions.resume)} type="button">Retomar</button>
            </div>
          </details>
        ) : null}

        {status === 2 ? (
          <details className={styles.action}>
            <summary>Recusar ou redirecionar</summary>
            <form className={styles.form} onSubmit={submitReject}>
              <label>
                <span>Destino</span>
                <select disabled={busy} onChange={(event) => setRejectId(event.target.value)} value={rejectId}>
                  <option value="0">Sem técnico / devolver à fila</option>
                  {normalizedTechnicians.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
              <label><span>Motivo</span><textarea disabled={busy} maxLength={10_000} onChange={(event) => setRejectReason(event.target.value)} required rows={3} value={rejectReason} /></label>
              <button className="button" disabled={busy || !rejectReason.trim()} type="submit">Confirmar recusa/redirecionamento</button>
            </form>
          </details>
        ) : null}

        {status === 2 || status === 3 ? (
          <details className={styles.action}>
            <summary>Finalizar</summary>
            <form className={styles.form} onSubmit={submitFinalize}>
              <label><span>Descrição de fechamento</span><textarea disabled={busy} maxLength={10_000} onChange={(event) => setFinalDescription(event.target.value)} required rows={4} value={finalDescription} /></label>
              <button className="button button-primary" disabled={busy || !finalDescription.trim()} type="submit">Finalizar</button>
            </form>
          </details>
        ) : null}

        {actions.progress && status >= 1 && status <= 3 ? (
          <details className={styles.action}>
            <summary>Atualizar progresso</summary>
            <form className={styles.form} onSubmit={submitProgress}>
              <label><span>Novo percentual</span><input disabled={busy} max={100} min={0} onChange={(event) => setProgress(event.target.value)} placeholder="0–100" required type="number" value={progress} /></label>
              <button className="button" disabled={busy || progress === ''} type="submit">Atualizar progresso</button>
            </form>
          </details>
        ) : null}
      </div>
    </section>
  );
}

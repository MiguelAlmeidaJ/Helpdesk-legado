"use client";

import type { TicketCatalogOption } from '@helpdesk/contracts';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft transition-colors hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_BUTTON_CLASS = `${BUTTON_CLASS} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;
const FORM_CLASS =
  'mt-3 grid gap-2.5 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-app-text-soft [&_input]:min-h-10 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:text-app-text [&_input]:outline-none [&_input]:transition [&_input]:focus:border-app-brand [&_input]:focus:ring-3 [&_input]:focus:ring-[var(--app-brand-ring)] [&_input]:disabled:cursor-not-allowed [&_input]:disabled:opacity-55 [&_select]:min-h-10 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:text-app-text [&_select]:outline-none [&_select]:transition [&_select]:focus:border-app-brand [&_select]:focus:ring-3 [&_select]:focus:ring-[var(--app-brand-ring)] [&_select]:disabled:cursor-not-allowed [&_select]:disabled:opacity-55 [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-app-border-strong [&_textarea]:bg-app-surface [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:text-app-text [&_textarea]:outline-none [&_textarea]:transition [&_textarea]:focus:border-app-brand [&_textarea]:focus:ring-3 [&_textarea]:focus:ring-[var(--app-brand-ring)] [&_textarea]:disabled:cursor-not-allowed [&_textarea]:disabled:opacity-55';
const ACTION_CLASS =
  'min-w-0 rounded-xl border border-app-border bg-app-surface p-3.5 [&_summary]:cursor-pointer [&_summary]:font-bold [&_summary]:text-app-text';

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
    <section
      className="grid gap-4 rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm shadow-slate-950/5 dark:shadow-black/10"
      aria-label={`Ações de ${resourceLabel}`}
    >
      <div className="flex items-start justify-between gap-4 max-sm:flex-col">
        <div>
          <span className="mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
            Operação
          </span>
          <h2 className="m-0 text-lg font-bold text-app-text">Ações do {resourceLabel}</h2>
          <p className="mt-1 text-sm text-app-muted">
            As permissões e transições válidas continuam sendo decididas pela API.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-app-surface-muted px-2.5 py-1 text-xs font-extrabold text-app-text-soft">
          {statusLabel}
        </span>
      </div>

      {feedback ? (
        <div
          className={`rounded-lg border px-3 py-2.5 text-sm ${
            feedback.error
              ? 'border-app-danger-border bg-app-danger-soft font-semibold text-app-danger'
              : 'border-app-border bg-app-surface-muted text-app-text-soft'
          }`}
          role="status"
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3 max-sm:grid-cols-1">
        <details className={ACTION_CLASS} open>
          <summary>Adicionar interação</summary>
          <form className={FORM_CLASS} onSubmit={submitInteraction}>
            <label>
              <span>Descrição</span>
              <textarea disabled={busy} maxLength={10_000} onChange={(event) => setInteraction(event.target.value)} required rows={4} value={interaction} />
            </label>
            <button className={PRIMARY_BUTTON_CLASS} disabled={busy || !interaction.trim()} type="submit">Registrar interação</button>
          </form>
        </details>

        {status === 1 ? (
          <details className={ACTION_CLASS} open>
            <summary>Iniciar ou direcionar</summary>
            <div className={FORM_CLASS}>
              <label>
                <span>Técnico</span>
                <select disabled={busy} onChange={(event) => setAssignmentId(event.target.value)} value={assignmentId}>
                  {normalizedTechnicians.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button className={PRIMARY_BUTTON_CLASS} disabled={busy} onClick={() => void run('Atendimento iniciado para o usuário atual.', () => actions.assignment(currentUser.id))} type="button">Iniciar comigo</button>
                <button className={BUTTON_CLASS} disabled={busy || Number(assignmentId) < 1} onClick={() => void run('Direcionamento registrado.', () => actions.assignment(Number(assignmentId)))} type="button">Direcionar</button>
              </div>
              <span className="text-sm text-app-muted">Se o escopo não permitir atuar neste registro, a API recusará a operação.</span>
            </div>
          </details>
        ) : null}

        {status === 2 ? (
          <details className={ACTION_CLASS}>
            <summary>Colocar em espera</summary>
            <form className={FORM_CLASS} onSubmit={submitHold}>
              <label><span>Previsão de retorno</span><input disabled={busy} onChange={(event) => setHoldAt(event.target.value)} required type="datetime-local" value={holdAt} /></label>
              <label><span>Motivo</span><textarea disabled={busy} maxLength={10_000} onChange={(event) => setHoldDescription(event.target.value)} required rows={3} value={holdDescription} /></label>
              <button className={BUTTON_CLASS} disabled={busy || !holdDescription.trim()} type="submit">Colocar em espera</button>
            </form>
          </details>
        ) : null}

        {status === 3 ? (
          <details className={ACTION_CLASS} open>
            <summary>Retomar execução</summary>
            <div className={FORM_CLASS}>
              <p className="m-0 text-sm text-app-muted">Encerra a espera ativa e devolve o registro para execução.</p>
              <button className={PRIMARY_BUTTON_CLASS} disabled={busy} onClick={() => void run('Registro retomado.', actions.resume)} type="button">Retomar</button>
            </div>
          </details>
        ) : null}

        {status === 2 ? (
          <details className={ACTION_CLASS}>
            <summary>Recusar ou redirecionar</summary>
            <form className={FORM_CLASS} onSubmit={submitReject}>
              <label>
                <span>Destino</span>
                <select disabled={busy} onChange={(event) => setRejectId(event.target.value)} value={rejectId}>
                  <option value="0">Sem técnico / devolver à fila</option>
                  {normalizedTechnicians.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
              <label><span>Motivo</span><textarea disabled={busy} maxLength={10_000} onChange={(event) => setRejectReason(event.target.value)} required rows={3} value={rejectReason} /></label>
              <button className={BUTTON_CLASS} disabled={busy || !rejectReason.trim()} type="submit">Confirmar recusa/redirecionamento</button>
            </form>
          </details>
        ) : null}

        {status === 2 || status === 3 ? (
          <details className={ACTION_CLASS}>
            <summary>Finalizar</summary>
            <form className={FORM_CLASS} onSubmit={submitFinalize}>
              <label><span>Descrição de fechamento</span><textarea disabled={busy} maxLength={10_000} onChange={(event) => setFinalDescription(event.target.value)} required rows={4} value={finalDescription} /></label>
              <button className={PRIMARY_BUTTON_CLASS} disabled={busy || !finalDescription.trim()} type="submit">Finalizar</button>
            </form>
          </details>
        ) : null}

        {actions.progress && status >= 1 && status <= 3 ? (
          <details className={ACTION_CLASS}>
            <summary>Atualizar progresso</summary>
            <form className={FORM_CLASS} onSubmit={submitProgress}>
              <label><span>Novo percentual</span><input disabled={busy} max={100} min={0} onChange={(event) => setProgress(event.target.value)} placeholder="0–100" required type="number" value={progress} /></label>
              <button className={BUTTON_CLASS} disabled={busy || progress === ''} type="submit">Atualizar progresso</button>
            </form>
          </details>
        ) : null}
      </div>
    </section>
  );
}

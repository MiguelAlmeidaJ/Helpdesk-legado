"use client";

import {
  AppPermission,
  PermissionScope,
  TicketStatus,
  type CurrentUserResponse,
  type TicketAssignmentOption,
  type TicketDetailResponse,
} from '@helpdesk/contracts';
import {
  type FormEvent,
  useState,
} from 'react';
import { ApiError } from '../../../shared/api/api-client';
import {
  fetchTicketDetail,
  fetchTicketRejectionTechnicians,
  rejectTicket,
} from '../api/tickets-api';
const styles = {
  card: 'overflow-hidden rounded-xl border border-app-border bg-app-surface',
  header:
    'flex min-h-12 items-center justify-between gap-3 border-b border-app-border-soft bg-app-surface-muted px-4 py-2.5 max-sm:flex-col max-sm:items-stretch [&>div]:grid [&>div]:gap-0.5 [&_h2]:m-0 [&_h2]:text-[15px] [&_span]:text-[11px] [&_span]:text-app-subtle [&_button]:min-h-[34px] [&_button]:rounded-lg [&_button]:border [&_button]:border-app-danger [&_button]:bg-app-surface [&_button]:px-3 [&_button]:text-[10px] [&_button]:font-extrabold [&_button]:text-app-danger [&_button]:transition-colors [&_button]:hover:bg-app-danger-soft max-sm:[&_button]:self-start',
  form:
    'grid grid-cols-1 items-end gap-3.5 px-4 py-3.5 min-[1051px]:grid-cols-[minmax(190px,0.8fr)_minmax(300px,1.6fr)_auto] [&>div]:grid [&>div]:gap-1.5 [&_label]:text-[10px] [&_label]:font-extrabold [&_label]:uppercase [&_label]:tracking-[0.03em] [&_label]:text-app-muted [&_select]:min-h-[38px] [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-2.5 [&_select]:text-app-text-soft [&_textarea]:min-h-[72px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-app-border-strong [&_textarea]:bg-app-surface [&_textarea]:px-2.5 [&_textarea]:py-2 [&_textarea]:text-app-text-soft [&_select:focus]:border-app-danger [&_select:focus]:outline-none [&_select:focus]:ring-3 [&_select:focus]:ring-red-500/10 [&_textarea:focus]:border-app-danger [&_textarea:focus]:outline-none [&_textarea:focus]:ring-3 [&_textarea:focus]:ring-red-500/10 [&>button]:min-h-[38px] [&>button]:rounded-lg [&>button]:border [&>button]:border-app-danger [&>button]:bg-app-danger [&>button]:px-3 [&>button]:text-[10px] [&>button]:font-extrabold [&>button]:whitespace-nowrap [&>button]:text-app-surface [&>button]:transition-opacity [&>button:disabled]:cursor-not-allowed [&>button:disabled]:opacity-50 [&_select:disabled]:cursor-not-allowed [&_select:disabled]:opacity-50 [&_textarea:disabled]:cursor-not-allowed [&_textarea:disabled]:opacity-50',
  feedback:
    'border-t border-app-danger-border bg-app-danger-soft px-4 py-2.5 text-[11px] leading-4 text-app-danger',
} as const;

function rejectScope(
  user: CurrentUserResponse,
): PermissionScope | null {
  const systemAdmin = user.grants.find(
    (grant) => grant.permission === AppPermission.SystemAdmin,
  );

  if (systemAdmin) {
    return PermissionScope.All;
  }

  return (
    user.grants.find(
      (grant) => grant.permission === AppPermission.TicketsReject,
    )?.scope ?? null
  );
}

function canReject(
  user: CurrentUserResponse,
  ticket: TicketDetailResponse,
): boolean {
  const scope = rejectScope(user);

  return (
    ticket.status === TicketStatus.InProgress &&
    (scope === PermissionScope.All ||
      (scope === PermissionScope.Own && ticket.technician.id === user.id))
  );
}

export function TicketRejectionActions({
  currentUser,
  ticket,
  onUpdated,
}: {
  currentUser: CurrentUserResponse;
  ticket: TicketDetailResponse;
  onUpdated: (ticket: TicketDetailResponse) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [technicians, setTechnicians] = useState<TicketAssignmentOption[]>([]);
  const [technicianId, setTechnicianId] = useState('0');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!canReject(currentUser, ticket)) {
    return null;
  }

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    setFeedback(null);

    if (technicians.length > 0) {
      return;
    }

    setLoading(true);

    try {
      const options = await fetchTicketRejectionTechnicians();
      setTechnicians(options.technicians);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 403) {
        setFeedback(
          'Seu usuário não possui permissão para recusar atendimentos.',
        );
      } else {
        setFeedback('Não foi possível carregar os destinos disponíveis.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const selectedTechnicianId = Number(technicianId);
    const normalizedReason = reason.trim();

    if (
      !Number.isSafeInteger(selectedTechnicianId) ||
      selectedTechnicianId < 0
    ) {
      setFeedback('Selecione um destino válido.');
      return;
    }

    if (!normalizedReason) {
      setFeedback('Informe a justificativa da recusa.');
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      await rejectTicket(ticket.id, {
        technicianId: selectedTechnicianId,
        reason: normalizedReason,
      });
      const updatedTicket = await fetchTicketDetail(ticket.id);

      onUpdated(updatedTicket);
      setOpen(false);
      setReason('');
      setTechnicianId('0');
      setFeedback(
        selectedTechnicianId === 0
          ? 'Atendimento devolvido para a fila.'
          : 'Atendimento recusado e direcionado para outro técnico.',
      );
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        setFeedback(
          'O atendimento mudou de estado. Recarregue antes de tentar novamente.',
        );
      } else if (error instanceof ApiError && error.status === 403) {
        setFeedback('Seu usuário não pode recusar este atendimento.');
      } else if (error instanceof ApiError && error.status === 404) {
        setFeedback('Atendimento não encontrado ou fora do seu escopo.');
      } else {
        setFeedback('Não foi possível recusar o atendimento.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <h2>Ações</h2>
          <span>Atendimento em execução</span>
        </div>
        <button onClick={toggle} type="button">
          {open ? 'Cancelar' : 'Recusar / Direcionar'}
        </button>
      </div>

      {open ? (
        <form className={styles.form} onSubmit={submit}>
          <div>
            <label htmlFor="ticket-rejection-technician">
              Destino após recusa
            </label>
            <select
              disabled={loading || saving || technicians.length === 0}
              id="ticket-rejection-technician"
              onChange={(event) => setTechnicianId(event.target.value)}
              value={technicianId}
            >
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ticket-rejection-reason">
              Justificativa
            </label>
            <textarea
              disabled={saving}
              id="ticket-rejection-reason"
              maxLength={10000}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Informe o motivo da recusa ou direcionamento..."
              required
              rows={3}
              value={reason}
            />
          </div>

          <button
            disabled={
              loading ||
              saving ||
              technicians.length === 0 ||
              reason.trim().length === 0
            }
            type="submit"
          >
            {saving
              ? 'Salvando…'
              : Number(technicianId) === 0
                ? 'Devolver para fila'
                : 'Recusar e direcionar'}
          </button>
        </form>
      ) : null}

      {feedback ? <div className={styles.feedback}>{feedback}</div> : null}
    </section>
  );
}

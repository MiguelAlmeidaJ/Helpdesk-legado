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
import styles from './ticket-rejection-actions.module.css';

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

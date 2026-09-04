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
  fetchTicketAssignmentTechnicians,
  fetchTicketDetail,
  updateTicketAssignment,
} from '../api/tickets-api';
import styles from './ticket-assignment-actions.module.css';

function executeScope(
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
      (grant) => grant.permission === AppPermission.TicketsExecute,
    )?.scope ?? null
  );
}

function canManageAssignment(
  user: CurrentUserResponse,
  ticket: TicketDetailResponse,
): boolean {
  const scope = executeScope(user);

  return (
    ticket.status === TicketStatus.WaitingExecution &&
    (scope === PermissionScope.All ||
      (scope === PermissionScope.Own && ticket.technician.id === user.id))
  );
}

export function TicketAssignmentActions({
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
  const [technicianId, setTechnicianId] = useState(String(currentUser.id));
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!canManageAssignment(currentUser, ticket)) {
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
      const options = await fetchTicketAssignmentTechnicians();
      setTechnicians(options.technicians);

      const hasCurrentUser = options.technicians.some(
        (technician) => technician.id === currentUser.id,
      );

      if (!hasCurrentUser && options.technicians[0]) {
        setTechnicianId(String(options.technicians[0].id));
      }
    } catch (reason: unknown) {
      if (reason instanceof ApiError && reason.status === 403) {
        setFeedback(
          'Seu usuário não possui permissão para executar atendimentos.',
        );
      } else {
        setFeedback('Não foi possível carregar os técnicos disponíveis.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const selectedTechnicianId = Number(technicianId);

    if (
      !Number.isSafeInteger(selectedTechnicianId) ||
      selectedTechnicianId < 1
    ) {
      setFeedback('Selecione um técnico válido.');
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      await updateTicketAssignment(ticket.id, {
        technicianId: selectedTechnicianId,
      });
      const updatedTicket = await fetchTicketDetail(ticket.id);

      onUpdated(updatedTicket);
      setOpen(false);
      setFeedback(
        selectedTechnicianId === currentUser.id
          ? 'Atendimento iniciado.'
          : 'Atendimento direcionado para outro técnico.',
      );
    } catch (reason: unknown) {
      if (reason instanceof ApiError && reason.status === 409) {
        setFeedback(
          'O atendimento mudou de estado. Recarregue antes de tentar novamente.',
        );
      } else if (reason instanceof ApiError && reason.status === 403) {
        setFeedback(
          'Seu usuário não pode executar esta ação neste atendimento.',
        );
      } else if (reason instanceof ApiError && reason.status === 404) {
        setFeedback('Atendimento não encontrado ou fora do seu escopo.');
      } else {
        setFeedback('Não foi possível atualizar o atendimento.');
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
          <span>Atendimento aguardando execução</span>
        </div>
        <button onClick={toggle} type="button">
          {open ? 'Cancelar' : 'Iniciar / Direcionar'}
        </button>
      </div>

      {open ? (
        <form className={styles.form} onSubmit={submit}>
          <div>
            <label htmlFor="ticket-assignment-technician">
              Técnico responsável
            </label>
            <select
              disabled={loading || saving || technicians.length === 0}
              id="ticket-assignment-technician"
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

          <p>
            Selecionar seu próprio usuário inicia a execução. Selecionar outro
            técnico mantém o atendimento aguardando até que ele confirme o início.
          </p>

          <button
            disabled={loading || saving || technicians.length === 0}
            type="submit"
          >
            {saving
              ? 'Salvando…'
              : Number(technicianId) === currentUser.id
                ? 'Iniciar atendimento'
                : 'Direcionar atendimento'}
          </button>
        </form>
      ) : null}

      {feedback ? <div className={styles.feedback}>{feedback}</div> : null}
    </section>
  );
}

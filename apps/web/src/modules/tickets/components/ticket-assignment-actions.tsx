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
const styles = {
  card: 'overflow-hidden rounded-xl border border-app-border bg-app-surface',
  header:
    'flex min-h-12 items-center justify-between gap-3 border-b border-app-border-soft bg-app-surface-muted px-4 py-2.5 max-sm:flex-col max-sm:items-stretch [&>div]:grid [&>div]:gap-0.5 [&_h2]:m-0 [&_h2]:text-[15px] [&_span]:text-[11px] [&_span]:text-app-subtle [&_button]:min-h-[34px] [&_button]:rounded-lg [&_button]:border [&_button]:border-app-success [&_button]:bg-app-surface [&_button]:px-3 [&_button]:text-[10px] [&_button]:font-extrabold [&_button]:text-app-success [&_button]:transition-colors [&_button]:hover:bg-app-success-soft max-sm:[&_button]:self-start',
  form:
    'grid grid-cols-1 items-end gap-3.5 px-4 py-3.5 min-[1051px]:grid-cols-[minmax(220px,1fr)_minmax(260px,1.5fr)_auto] [&>div]:grid [&>div]:gap-1.5 [&_label]:text-[10px] [&_label]:font-extrabold [&_label]:uppercase [&_label]:tracking-[0.03em] [&_label]:text-app-muted [&_select]:min-h-[38px] [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-2.5 [&_select]:text-app-text-soft [&_select]:outline-none [&_select]:transition [&_select:focus]:border-app-success [&_select:focus]:ring-3 [&_select:focus]:ring-emerald-500/10 [&>p]:m-0 [&>p]:text-[11px] [&>p]:leading-5 [&>p]:text-app-muted-strong [&>button]:min-h-[34px] [&>button]:rounded-lg [&>button]:border [&>button]:border-app-success [&>button]:bg-app-success [&>button]:px-3 [&>button]:text-[10px] [&>button]:font-extrabold [&>button]:whitespace-nowrap [&>button]:text-app-surface [&>button]:transition-opacity [&>button:disabled]:cursor-not-allowed [&>button:disabled]:opacity-50 [&_select:disabled]:cursor-not-allowed [&_select:disabled]:opacity-50',
  feedback:
    'border-t border-app-border-soft bg-app-success-soft px-4 py-2.5 text-[11px] leading-4 text-app-success',
} as const;

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

"use client";

import {
  AppPermission,
  PermissionScope,
  TICKET_HOLD_CAUSES,
  TicketStatus,
  type CurrentUserResponse,
  type TicketDetailResponse,
  type TicketHoldCause,
} from '@helpdesk/contracts';
import {
  type FormEvent,
  useState,
} from 'react';
import { ApiError } from '../../../shared/api/api-client';
import {
  fetchTicketDetail,
  putTicketOnHold,
  resumeTicket,
} from '../api/tickets-api';
import styles from './ticket-hold-actions.module.css';

function holdScope(
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
      (grant) => grant.permission === AppPermission.TicketsHold,
    )?.scope ?? null
  );
}

function ownsTicket(
  user: CurrentUserResponse,
  ticket: TicketDetailResponse,
  scope: PermissionScope | null,
): boolean {
  return (
    scope === PermissionScope.All ||
    (scope === PermissionScope.Own && ticket.technician.id === user.id)
  );
}

function canPutOnHold(
  user: CurrentUserResponse,
  ticket: TicketDetailResponse,
): boolean {
  const scope = holdScope(user);

  return (
    (ticket.status === TicketStatus.WaitingExecution ||
      ticket.status === TicketStatus.InProgress) &&
    ownsTicket(user, ticket, scope)
  );
}

function canResume(
  user: CurrentUserResponse,
  ticket: TicketDetailResponse,
): boolean {
  const scope = holdScope(user);

  return (
    ticket.status === TicketStatus.OnHold &&
    ownsTicket(user, ticket, scope)
  );
}

function defaultForecastValue(): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const localTime = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );

  return localTime.toISOString().slice(0, 16);
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function TicketHoldActions({
  currentUser,
  ticket,
  onUpdated,
}: {
  currentUser: CurrentUserResponse;
  ticket: TicketDetailResponse;
  onUpdated: (ticket: TicketDetailResponse) => void;
}) {
  const putAllowed = canPutOnHold(currentUser, ticket);
  const resumeAllowed = canResume(currentUser, ticket);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [forecastAt, setForecastAt] = useState(defaultForecastValue);
  const [cause, setCause] = useState<TicketHoldCause>('Cliente');
  const [description, setDescription] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!putAllowed && !resumeAllowed) {
    return null;
  }

  async function refreshTicket() {
    const updatedTicket = await fetchTicketDetail(ticket.id);
    onUpdated(updatedTicket);
  }

  async function submitHold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedDescription = description.trim();
    const forecastDate = new Date(forecastAt);

    if (
      Number.isNaN(forecastDate.getTime()) ||
      forecastDate.getTime() <= Date.now()
    ) {
      setFeedback('Informe uma previsão de retorno futura.');
      return;
    }

    if (!normalizedDescription) {
      setFeedback('Informe o motivo detalhado da espera.');
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      await putTicketOnHold(ticket.id, {
        forecastAt: forecastDate.toISOString(),
        cause,
        description: normalizedDescription,
      });
      await refreshTicket();

      setOpen(false);
      setDescription('');
      setForecastAt(defaultForecastValue());
      setFeedback('Atendimento colocado em espera.');
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        setFeedback(
          'O estado do atendimento mudou ou ele já possui uma espera ativa.',
        );
      } else if (error instanceof ApiError && error.status === 403) {
        setFeedback('Seu usuário não pode colocar este atendimento em espera.');
      } else if (error instanceof ApiError && error.status === 404) {
        setFeedback('Atendimento não encontrado ou fora do seu escopo.');
      } else {
        setFeedback('Não foi possível colocar o atendimento em espera.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function resume() {
    setSaving(true);
    setFeedback(null);

    try {
      await resumeTicket(ticket.id);
      await refreshTicket();
      setFeedback('Atendimento retomado e novamente em execução.');
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        setFeedback(
          'O atendimento não está mais em espera ou o registro ativo não foi localizado.',
        );
      } else if (error instanceof ApiError && error.status === 403) {
        setFeedback('Seu usuário não pode retomar este atendimento.');
      } else if (error instanceof ApiError && error.status === 404) {
        setFeedback('Atendimento não encontrado ou fora do seu escopo.');
      } else {
        setFeedback('Não foi possível retomar o atendimento.');
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
          <span>
            {resumeAllowed
              ? 'Atendimento em espera'
              : 'Controle de espera'}
          </span>
        </div>

        {putAllowed ? (
          <button onClick={() => setOpen((current) => !current)} type="button">
            {open ? 'Cancelar' : 'Colocar em espera'}
          </button>
        ) : null}

        {resumeAllowed && ticket.hold ? (
          <button disabled={saving} onClick={resume} type="button">
            {saving ? 'Retomando…' : 'Retomar atendimento'}
          </button>
        ) : null}
      </div>

      {putAllowed && open ? (
        <form className={styles.form} onSubmit={submitHold}>
          <div>
            <label htmlFor="ticket-hold-forecast">Previsão de retorno</label>
            <input
              disabled={saving}
              id="ticket-hold-forecast"
              onChange={(event) => setForecastAt(event.target.value)}
              required
              type="datetime-local"
              value={forecastAt}
            />
          </div>

          <div>
            <label htmlFor="ticket-hold-cause">Causa</label>
            <select
              disabled={saving}
              id="ticket-hold-cause"
              onChange={(event) =>
                setCause(event.target.value as TicketHoldCause)
              }
              value={cause}
            >
              {TICKET_HOLD_CAUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.descriptionField}>
            <label htmlFor="ticket-hold-description">Descrição</label>
            <textarea
              disabled={saving}
              id="ticket-hold-description"
              maxLength={10000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Explique o que estamos aguardando..."
              required
              rows={3}
              value={description}
            />
          </div>

          <button
            disabled={saving || description.trim().length === 0}
            type="submit"
          >
            {saving ? 'Salvando…' : 'Confirmar espera'}
          </button>
        </form>
      ) : null}

      {resumeAllowed ? (
        ticket.hold ? (
          <div className={styles.activeHold}>
            <div>
              <span>Causa</span>
              <strong>{ticket.hold.cause}</strong>
            </div>
            <div>
              <span>Previsão de retorno</span>
              <strong>{formatDate(ticket.hold.forecastAt)}</strong>
            </div>
            <div>
              <span>Em espera desde</span>
              <strong>{formatDate(ticket.hold.startedAt)}</strong>
            </div>
            <div>
              <span>Registrado por</span>
              <strong>{ticket.hold.user.name ?? `#${ticket.hold.user.id}`}</strong>
            </div>
            <p>{ticket.hold.description}</p>
          </div>
        ) : (
          <div className={styles.warning}>
            O chamado está marcado como Em espera, mas não possui um registro
            de espera ativo. A retomada foi bloqueada para evitar inconsistência.
          </div>
        )
      ) : null}

      {feedback ? <div className={styles.feedback}>{feedback}</div> : null}
    </section>
  );
}

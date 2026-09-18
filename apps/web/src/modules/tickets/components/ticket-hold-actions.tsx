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
const styles = {
  card: 'overflow-hidden rounded-xl border border-app-border bg-app-surface',
  header:
    'flex min-h-12 items-center justify-between gap-3 border-b border-app-border-soft bg-app-surface-muted px-4 py-2.5 max-[680px]:flex-col max-[680px]:items-stretch [&>div]:grid [&>div]:gap-0.5 [&_h2]:m-0 [&_h2]:text-[15px] [&_span]:text-[11px] [&_span]:text-app-subtle [&_button]:min-h-[34px] [&_button]:rounded-lg [&_button]:border [&_button]:border-amber-600 [&_button]:bg-app-surface [&_button]:px-3 [&_button]:text-[10px] [&_button]:font-extrabold [&_button]:text-amber-700 [&_button]:transition-colors [&_button]:hover:bg-amber-50 [&_button]:disabled:cursor-not-allowed [&_button]:disabled:opacity-50 dark:[&_button]:border-amber-400/70 dark:[&_button]:text-amber-300 dark:[&_button]:hover:bg-amber-950/40 max-[680px]:[&_button]:self-start',
  form:
    'grid grid-cols-1 items-end gap-3.5 px-4 py-3.5 min-[681px]:grid-cols-2 min-[1101px]:grid-cols-[minmax(185px,0.8fr)_minmax(150px,0.6fr)_minmax(300px,1.5fr)_auto] [&>div]:grid [&>div]:gap-1.5 [&_label]:text-[10px] [&_label]:font-extrabold [&_label]:uppercase [&_label]:tracking-[0.03em] [&_label]:text-app-subtle [&_input]:min-h-[38px] [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-2.5 [&_input]:py-2 [&_input]:text-xs [&_input]:text-app-text-soft [&_select]:min-h-[38px] [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-2.5 [&_select]:py-2 [&_select]:text-xs [&_select]:text-app-text-soft [&_textarea]:min-h-[72px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-app-border-strong [&_textarea]:bg-app-surface [&_textarea]:px-2.5 [&_textarea]:py-2 [&_textarea]:text-xs [&_textarea]:leading-5 [&_textarea]:text-app-text-soft [&_input:focus]:border-amber-600 [&_input:focus]:outline-none [&_input:focus]:ring-3 [&_input:focus]:ring-amber-500/10 [&_select:focus]:border-amber-600 [&_select:focus]:outline-none [&_select:focus]:ring-3 [&_select:focus]:ring-amber-500/10 [&_textarea:focus]:border-amber-600 [&_textarea:focus]:outline-none [&_textarea:focus]:ring-3 [&_textarea:focus]:ring-amber-500/10 [&>button]:min-h-[38px] [&>button]:rounded-lg [&>button]:border [&>button]:border-amber-700 [&>button]:bg-amber-700 [&>button]:px-3 [&>button]:text-[10px] [&>button]:font-extrabold [&>button]:whitespace-nowrap [&>button]:text-white [&>button]:transition-colors [&>button]:hover:bg-amber-800 [&>button:disabled]:cursor-not-allowed [&>button:disabled]:opacity-50 [&_input:disabled]:cursor-not-allowed [&_input:disabled]:opacity-50 [&_select:disabled]:cursor-not-allowed [&_select:disabled]:opacity-50 [&_textarea:disabled]:cursor-not-allowed [&_textarea:disabled]:opacity-50 dark:[&>button]:border-amber-500 dark:[&>button]:bg-amber-500 dark:[&>button]:text-slate-950 dark:[&>button]:hover:bg-amber-400',
  descriptionField: 'min-[681px]:col-span-2 min-[1101px]:col-span-1',
  activeHold:
    'grid grid-cols-1 gap-x-4 gap-y-3 bg-amber-50/80 px-4 py-3.5 min-[681px]:grid-cols-2 min-[1101px]:grid-cols-4 dark:bg-amber-950/20 [&>div]:grid [&>div]:gap-1 [&_span]:text-[10px] [&_span]:font-extrabold [&_span]:uppercase [&_span]:tracking-[0.03em] [&_span]:text-app-subtle [&_strong]:text-xs [&_strong]:text-app-text-soft [&>p]:m-0 [&>p]:border-t [&>p]:border-amber-200 [&>p]:pt-2.5 [&>p]:text-xs [&>p]:leading-5 [&>p]:whitespace-pre-wrap [&>p]:text-app-muted min-[681px]:[&>p]:col-span-2 min-[1101px]:[&>p]:col-span-4 dark:[&>p]:border-amber-900/60',
  warning:
    'border-t border-app-danger-border bg-app-danger-soft px-4 py-2.5 text-[11px] leading-5 text-app-danger',
  feedback:
    'border-t border-amber-200 bg-amber-50/80 px-4 py-2.5 text-[11px] leading-5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200',
} as const;

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

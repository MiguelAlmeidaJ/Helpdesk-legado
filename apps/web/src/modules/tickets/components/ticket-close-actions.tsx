"use client";

import {
  AppPermission,
  PermissionScope,
  TicketStatus,
  type CurrentUserResponse,
  type TicketDetailResponse,
} from '@helpdesk/contracts';
import { type FormEvent, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import {
  concludeTicket,
  fetchTicketDetail,
  finalizeTicket,
} from '../api/tickets-api';
import styles from './ticket-close-actions.module.css';

type Mode = 'conclude' | 'finalize';

function scope(user: CurrentUserResponse): PermissionScope | null {
  if (user.grants.some((g) => g.permission === AppPermission.SystemAdmin)) {
    return PermissionScope.All;
  }
  return user.grants.find((g) => g.permission === AppPermission.TicketsClose)
    ?.scope ?? null;
}

function canConclude(
  user: CurrentUserResponse,
  ticket: TicketDetailResponse,
): boolean {
  const value = scope(user);
  return ticket.status === TicketStatus.InProgress &&
    (value === PermissionScope.All ||
      (value === PermissionScope.Own && ticket.technician.id === user.id));
}

function canFinalize(
  user: CurrentUserResponse,
  ticket: TicketDetailResponse,
): boolean {
  const value = scope(user);
  if (value === PermissionScope.All) {
    return [
      TicketStatus.InProgress,
      TicketStatus.OnHold,
      TicketStatus.Completed,
    ].includes(ticket.status);
  }
  return value === PermissionScope.Own &&
    ticket.status === TicketStatus.InProgress &&
    ticket.technician.id === user.id;
}

export function TicketCloseActions({
  currentUser,
  ticket,
  onUpdated,
}: {
  currentUser: CurrentUserResponse;
  ticket: TicketDetailResponse;
  onUpdated: (ticket: TicketDetailResponse) => void;
}) {
  const concludeAllowed = canConclude(currentUser, ticket);
  const finalizeAllowed = canFinalize(currentUser, ticket);
  const [mode, setMode] = useState<Mode | null>(null);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!concludeAllowed && !finalizeAllowed) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode) return;

    const value = description.trim();
    if (!value) {
      setFeedback('Informe uma descrição para concluir a ação.');
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      if (mode === 'conclude') {
        await concludeTicket(ticket.id, { description: value });
      } else {
        await finalizeTicket(ticket.id, { description: value });
      }

      setMode(null);
      setDescription('');
      setFeedback(
        mode === 'conclude'
          ? 'Atendimento marcado como concluído.'
          : 'Atendimento finalizado.',
      );

      try {
        onUpdated(await fetchTicketDetail(ticket.id));
      } catch {
        setFeedback('A ação foi salva, mas a tela não atualizou. Recarregue a página.');
      }
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        setFeedback('O estado mudou. Recarregue antes de tentar novamente.');
      } else if (error instanceof ApiError && error.status === 403) {
        setFeedback('Operação bloqueada por permissão ou proteção de origem.');
      } else if (error instanceof ApiError && error.status === 404) {
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
          <h2>Conclusão e fechamento</h2>
          <span>{ticket.statusLabel}</span>
        </div>
        <div className={styles.actions}>
          {concludeAllowed ? (
            <button onClick={() => setMode(mode === 'conclude' ? null : 'conclude')} type="button">
              {mode === 'conclude' ? 'Cancelar conclusão' : 'Concluir'}
            </button>
          ) : null}
          {finalizeAllowed ? (
            <button onClick={() => setMode(mode === 'finalize' ? null : 'finalize')} type="button">
              {mode === 'finalize' ? 'Cancelar finalização' : 'Finalizar'}
            </button>
          ) : null}
        </div>
      </div>

      {mode ? (
        <form className={styles.form} onSubmit={submit}>
          <label htmlFor="ticket-close-description">
            {mode === 'conclude' ? 'Motivo da conclusão' : 'Descrição de fechamento'}
          </label>
          <textarea
            autoFocus
            disabled={saving}
            id="ticket-close-description"
            maxLength={10000}
            onChange={(event) => setDescription(event.target.value)}
            required
            rows={4}
            value={description}
          />
          <div className={styles.footer}>
            <small>{description.length.toLocaleString('pt-BR')}/10.000</small>
            <button disabled={saving || !description.trim()} type="submit">
              {saving
                ? 'Salvando…'
                : mode === 'conclude'
                  ? 'Confirmar conclusão'
                  : 'Confirmar finalização'}
            </button>
          </div>
        </form>
      ) : null}

      {feedback ? <div className={styles.feedback}>{feedback}</div> : null}
    </section>
  );
}

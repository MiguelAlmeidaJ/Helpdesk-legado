"use client";

import {
  AppPermission,
  PermissionScope,
  TICKET_HOLD_CAUSES,
  TicketStatus,
  type CurrentUserResponse,
  type TicketHoldCause,
  type TicketListItem,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import {
  acceptTicketQuick,
  fetchTicketTransferTechnicians,
  putTicketOnHold,
  transferTicketQuick,
} from '../api/tickets-api';

function IconButton({
  label,
  children,
  onClick,
  disabled = false,
  href,
  tone = 'neutral',
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  href?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'brand';
}) {
  const toneClass = {
    neutral:
      'border-app-border text-app-muted-strong hover:border-app-brand hover:text-app-brand',
    success:
      'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30',
    warning:
      'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30',
    brand:
      'border-app-brand/40 text-app-brand hover:bg-app-brand-soft',
  }[tone];

  const className = `inline-flex size-9 items-center justify-center rounded-lg border bg-app-surface transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`;

  if (href) {
    return (
      <Link aria-label={label} className={className} href={href} title={label}>
        {children}
      </Link>
    );
  }

  return (
    <button
      aria-label={label}
      className={className}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="size-4.5" fill="none" viewBox="0 0 24 24">
      <path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function AcceptIcon() {
  return (
    <svg aria-hidden="true" className="size-4.5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8 12 2.5 2.5L16.5 8.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg aria-hidden="true" className="size-4.5" fill="none" viewBox="0 0 24 24">
      <path d="M4 7h12m0 0-3-3m3 3-3 3M20 17H8m0 0 3 3m-3-3 3-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </svg>
  );
}

function HoldIcon() {
  return (
    <svg aria-hidden="true" className="size-4.5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.5 8v8M14.5 8v8" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}

function hasPermission(user: CurrentUserResponse, permission: AppPermission) {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === permission,
  );
}

function permissionScope(
  user: CurrentUserResponse,
  permission: AppPermission,
): PermissionScope | null {
  if (
    user.grants.some(
      (grant) => grant.permission === AppPermission.SystemAdmin,
    )
  ) {
    return PermissionScope.All;
  }

  return (
    user.grants.find((grant) => grant.permission === permission)?.scope ?? null
  );
}

function canHold(user: CurrentUserResponse, ticket: TicketListItem) {
  if (!hasPermission(user, AppPermission.TicketsHold)) {
    return false;
  }

  if (
    ticket.status !== TicketStatus.WaitingExecution &&
    ticket.status !== TicketStatus.InProgress
  ) {
    return false;
  }

  const scope = permissionScope(user, AppPermission.TicketsHold);
  return (
    scope === PermissionScope.All ||
    (scope === PermissionScope.Own && ticket.technician.id === user.id)
  );
}

function defaultForecastValue(): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const localTime = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return localTime.toISOString().slice(0, 16);
}

export function TicketListActions({
  currentUser,
  ticket,
  onChanged,
}: {
  currentUser: CurrentUserResponse;
  ticket: TicketListItem;
  onChanged: () => Promise<void> | void;
}) {
  const [dialog, setDialog] = useState<'transfer' | 'hold' | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<Array<{ id: number; name: string }>>([]);
  const [technicianId, setTechnicianId] = useState('');
  const [forecastAt, setForecastAt] = useState(defaultForecastValue);
  const [cause, setCause] = useState<TicketHoldCause>('Cliente');
  const [description, setDescription] = useState('');

  const canAccept =
    ticket.status === TicketStatus.WaitingExecution &&
    ticket.technician.id === currentUser.id;

  const canTransfer =
    hasPermission(currentUser, AppPermission.TicketsEdit) &&
    (ticket.status === TicketStatus.WaitingExecution ||
      ticket.status === TicketStatus.InProgress);

  const holdAllowed = canHold(currentUser, ticket);

  const availableTechnicians = useMemo(
    () => technicians.filter((technician) => technician.id !== ticket.technician.id),
    [technicians, ticket.technician.id],
  );

  useEffect(() => {
    if (dialog !== 'transfer' || technicians.length) return;

    setBusy(true);
    setFeedback(null);
    fetchTicketTransferTechnicians()
      .then((response) => {
        setTechnicians(response.technicians);
        const first = response.technicians.find(
          (technician) => technician.id !== ticket.technician.id,
        );
        setTechnicianId(first ? String(first.id) : '');
      })
      .catch(() => {
        setFeedback('Não foi possível carregar os técnicos disponíveis.');
      })
      .finally(() => setBusy(false));
  }, [dialog, technicians.length, ticket.technician.id]);

  async function accept() {
    setBusy(true);
    setFeedback(null);
    try {
      await acceptTicketQuick(ticket.id);
      await onChanged();
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) {
        setFeedback('O atendimento já mudou de estado.');
      } else {
        setFeedback('Não foi possível aceitar o atendimento.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function transfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = Number(technicianId);
    if (!Number.isSafeInteger(target) || target < 1) return;

    setBusy(true);
    setFeedback(null);
    try {
      await transferTicketQuick(ticket.id, target);
      setDialog(null);
      await onChanged();
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) {
        setFeedback('O atendimento mudou de estado. Atualize a lista.');
      } else if (reason instanceof ApiError && reason.status === 403) {
        setFeedback('Seu usuário não possui permissão para transferir.');
      } else {
        setFeedback('Não foi possível transferir o atendimento.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function hold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = description.trim();
    const forecast = new Date(forecastAt);
    if (!normalized) {
      setFeedback('Informe o motivo da espera.');
      return;
    }
    if (Number.isNaN(forecast.getTime()) || forecast.getTime() <= Date.now()) {
      setFeedback('Informe uma previsão de retorno futura.');
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      await putTicketOnHold(ticket.id, {
        forecastAt: forecast.toISOString(),
        cause,
        description: normalized,
      });
      setDialog(null);
      setDescription('');
      setForecastAt(defaultForecastValue());
      await onChanged();
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 403) {
        setFeedback('Seu usuário não possui permissão para colocar em espera.');
      } else if (reason instanceof ApiError && reason.status === 409) {
        setFeedback('O atendimento mudou de estado ou já está em espera.');
      } else {
        setFeedback('Não foi possível colocar o atendimento em espera.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <IconButton
          href={`/atendimentos/${ticket.id}`}
          label="Abrir atendimento"
          tone="brand"
        >
          <EyeIcon />
        </IconButton>

        {canAccept ? (
          <IconButton
            disabled={busy}
            label="Aceitar atendimento"
            onClick={() => void accept()}
            tone="success"
          >
            <AcceptIcon />
          </IconButton>
        ) : null}

        {canTransfer ? (
          <IconButton
            disabled={busy}
            label="Transferir atendimento"
            onClick={() => {
              setFeedback(null);
              setDialog('transfer');
            }}
          >
            <TransferIcon />
          </IconButton>
        ) : null}

        {holdAllowed ? (
          <IconButton
            disabled={busy}
            label="Colocar em espera"
            onClick={() => {
              setFeedback(null);
              setDialog('hold');
            }}
            tone="warning"
          >
            <HoldIcon />
          </IconButton>
        ) : null}
      </div>

      {feedback && !dialog ? (
        <span className="mt-2 block text-xs text-app-danger">{feedback}</span>
      ) : null}

      {dialog ? (
        <div
          className="fixed inset-0 z-[120] grid place-items-center bg-black/50 p-4 backdrop-blur-[1px]"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !busy) setDialog(null);
          }}
          role="presentation"
        >
          <section
            aria-modal="true"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-2xl"
            role="dialog"
          >
            <header className="flex items-start justify-between gap-4 border-b border-app-border-soft px-5 py-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-app-brand">
                  Atendimento #{ticket.id}
                </span>
                <h3 className="m-0 mt-1 text-lg font-extrabold">
                  {dialog === 'transfer'
                    ? 'Transferir técnico'
                    : 'Colocar em espera'}
                </h3>
              </div>
              <button
                aria-label="Fechar"
                className="size-9 rounded-lg border border-app-border text-app-muted hover:bg-app-surface-hover"
                disabled={busy}
                onClick={() => setDialog(null)}
                type="button"
              >
                ×
              </button>
            </header>

            {dialog === 'transfer' ? (
              <form className="grid gap-4 p-5" onSubmit={transfer}>
                <label className="grid gap-1.5 text-xs font-bold text-app-muted">
                  Novo técnico responsável
                  <select
                    className="min-h-11 rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm outline-none focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)]"
                    disabled={busy || availableTechnicians.length === 0}
                    onChange={(event) => setTechnicianId(event.target.value)}
                    value={technicianId}
                  >
                    {availableTechnicians.map((technician) => (
                      <option key={technician.id} value={technician.id}>
                        {technician.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="m-0 text-xs leading-5 text-app-muted">
                  Ao transferir um atendimento em execução, ele volta para
                  “Aguardando execução” até o novo técnico aceitar.
                </p>
                {feedback ? (
                  <div className="rounded-lg bg-app-danger-soft px-3 py-2 text-xs text-app-danger">
                    {feedback}
                  </div>
                ) : null}
                <div className="flex justify-end gap-2">
                  <button
                    className="min-h-10 rounded-lg border border-app-border px-4 text-sm font-bold"
                    disabled={busy}
                    onClick={() => setDialog(null)}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="min-h-10 rounded-lg bg-app-brand px-4 text-sm font-extrabold text-app-brand-contrast disabled:opacity-50"
                    disabled={busy || !technicianId}
                    type="submit"
                  >
                    {busy ? 'Transferindo…' : 'Transferir'}
                  </button>
                </div>
              </form>
            ) : (
              <form className="grid gap-4 p-5" onSubmit={hold}>
                <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                  <label className="grid gap-1.5 text-xs font-bold text-app-muted">
                    Previsão de retorno
                    <input
                      className="min-h-11 rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm outline-none focus:border-app-brand"
                      disabled={busy}
                      onChange={(event) => setForecastAt(event.target.value)}
                      type="datetime-local"
                      value={forecastAt}
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-bold text-app-muted">
                    Causa
                    <select
                      className="min-h-11 rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm outline-none focus:border-app-brand"
                      disabled={busy}
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
                  </label>
                </div>
                <label className="grid gap-1.5 text-xs font-bold text-app-muted">
                  Motivo
                  <textarea
                    className="min-h-24 resize-y rounded-lg border border-app-border-strong bg-app-surface px-3 py-2 text-sm outline-none focus:border-app-brand"
                    disabled={busy}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Explique o que estamos aguardando..."
                    value={description}
                  />
                </label>
                {feedback ? (
                  <div className="rounded-lg bg-app-danger-soft px-3 py-2 text-xs text-app-danger">
                    {feedback}
                  </div>
                ) : null}
                <div className="flex justify-end gap-2">
                  <button
                    className="min-h-10 rounded-lg border border-app-border px-4 text-sm font-bold"
                    disabled={busy}
                    onClick={() => setDialog(null)}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="min-h-10 rounded-lg bg-amber-600 px-4 text-sm font-extrabold text-white disabled:opacity-50"
                    disabled={busy || !description.trim()}
                    type="submit"
                  >
                    {busy ? 'Salvando…' : 'Colocar em espera'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}

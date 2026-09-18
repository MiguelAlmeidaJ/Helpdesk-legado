"use client";

import {
  AppPermission,
  PermissionScope,
  type CurrentUserResponse,
  type TicketAttachment,
  type TicketDetailResponse,
} from '@helpdesk/contracts';
import { type ChangeEvent, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import {
  deleteTicketAttachment,
  fetchTicketAttachments,
  fetchTicketDetail,
  ticketAttachmentContentUrl,
  uploadTicketAttachment,
} from '../api/tickets-api';
const styles = {
  card: 'overflow-hidden rounded-xl border border-app-border bg-app-surface',
  header:
    'flex items-center justify-between gap-3 border-b border-app-border-soft bg-app-surface-muted px-4 py-2.5 max-[600px]:flex-col max-[600px]:items-stretch [&_h2]:m-0 [&_h2]:text-[15px] [&_span]:text-[11px] [&_span]:text-app-subtle',
  upload:
    'inline-flex min-h-[34px] cursor-pointer items-center rounded-lg border border-app-brand px-3 text-[10px] font-extrabold text-app-brand transition hover:bg-app-brand-soft [&_input]:hidden',
  body:
    'grid [&>p]:m-0 [&>p]:px-4 [&>p]:py-3.5 [&>p]:text-xs [&>p]:text-app-subtle',
  item:
    'flex items-center justify-between gap-3 border-b border-app-border-soft px-4 py-2.5 last:border-b-0 max-[600px]:flex-col max-[600px]:items-stretch [&>div:first-child]:grid [&>div:first-child]:gap-0.5 [&_strong]:text-xs [&_small]:text-[10px] [&_small]:text-app-subtle',
  actions:
    'flex items-center gap-2 max-[600px]:self-start [&_a]:cursor-pointer [&_a]:rounded-[7px] [&_a]:border [&_a]:border-app-border-strong [&_a]:bg-app-surface [&_a]:px-[9px] [&_a]:py-1.5 [&_a]:text-[10px] [&_a]:font-bold [&_a]:text-app-brand [&_a]:no-underline [&_a]:transition [&_a:hover]:bg-app-surface-hover [&_button]:cursor-pointer [&_button]:rounded-[7px] [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-[9px] [&_button]:py-1.5 [&_button]:text-[10px] [&_button]:font-bold [&_button]:text-app-danger [&_button]:transition [&_button:hover]:bg-app-danger-soft [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50',
  feedback:
    'border-t border-app-border-soft bg-app-surface-hover px-4 py-[9px] text-[11px] text-app-muted',
} as const;

function canMutate(user: CurrentUserResponse, ticket: TicketDetailResponse) {
  if (user.grants.some((g) => g.permission === AppPermission.SystemAdmin)) {
    return true;
  }
  const grant = user.grants.find(
    (g) => g.permission === AppPermission.TicketsExecute,
  );
  return grant?.scope === PermissionScope.All ||
    (grant?.scope === PermissionScope.Own &&
      ticket.technician.id === user.id);
}

export function TicketAttachmentsPanel({
  currentUser,
  ticket,
  onUpdated,
}: {
  currentUser: CurrentUserResponse;
  ticket: TicketDetailResponse;
  onUpdated: (ticket: TicketDetailResponse) => void;
}) {
  const mutate = canMutate(currentUser, ticket);
  const [items, setItems] = useState<TicketAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function reload() {
    const response = await fetchTicketAttachments(ticket.id);
    setItems(response.attachments);
  }

  useEffect(() => {
    let active = true;
    fetchTicketAttachments(ticket.id)
      .then((response) => {
        if (active) setItems(response.attachments);
      })
      .catch(() => {
        if (active) setFeedback('Não foi possível carregar os anexos.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [ticket.id]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setFeedback('O arquivo excede o limite de 25 MB.');
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      await uploadTicketAttachment(ticket.id, file);
      await reload();
      try { onUpdated(await fetchTicketDetail(ticket.id)); } catch {}
      setFeedback('Anexo adicionado.');
    } catch (error: unknown) {
      setFeedback(
        error instanceof ApiError && error.status === 403
          ? 'Seu usuário não pode anexar neste atendimento.'
          : 'Não foi possível enviar o anexo.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(attachment: TicketAttachment) {
    if (!window.confirm(`Excluir "${attachment.name}"?`)) return;
    setSaving(true);
    setFeedback(null);
    try {
      await deleteTicketAttachment(
        ticket.id,
        attachment.kind,
        attachment.id,
      );
      await reload();
      try { onUpdated(await fetchTicketDetail(ticket.id)); } catch {}
      setFeedback('Anexo excluído.');
    } catch {
      setFeedback('Não foi possível excluir o anexo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div><h2>Anexos</h2><span>{items.length} item(ns)</span></div>
        {mutate ? (
          <label className={styles.upload}>
            {saving ? 'Processando…' : 'Adicionar arquivo'}
            <input disabled={saving} onChange={upload} type="file" />
          </label>
        ) : null}
      </div>
      <div className={styles.body}>
        {loading ? <p>Carregando anexos…</p> : null}
        {!loading && items.length === 0 ? <p>Nenhum anexo.</p> : null}
        {items.map((attachment) => (
          <div className={styles.item} key={`${attachment.kind}-${attachment.id}`}>
            <div>
              <strong>{attachment.name}</strong>
              <small>{attachment.kind === 'image' ? 'Imagem legada' : attachment.mimeType}</small>
            </div>
            <div className={styles.actions}>
              <a
                href={ticketAttachmentContentUrl(
                  ticket.id,
                  attachment.kind,
                  attachment.id,
                )}
                rel="noreferrer"
                target="_blank"
              >
                Abrir
              </a>
              {mutate ? (
                <button disabled={saving} onClick={() => void remove(attachment)} type="button">
                  Excluir
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {feedback ? <div className={styles.feedback}>{feedback}</div> : null}
    </section>
  );
}

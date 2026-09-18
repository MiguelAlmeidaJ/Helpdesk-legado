"use client";

import type { TicketProjectTaskImage } from '@helpdesk/contracts';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import {
  deleteDevOpsTicketImage,
  devOpsTicketImageContentUrl,
  fetchDevOpsTicketImages,
  replaceDevOpsTicketImage,
  uploadDevOpsTicketImage,
} from '../api/modular-ticket-workflow-api';

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft transition-colors hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const FILE_INPUT_CLASS =
  'max-w-full text-sm text-app-muted file:mr-3 file:rounded-lg file:border file:border-app-border-strong file:bg-app-surface-muted file:px-3 file:py-2 file:text-sm file:font-bold file:text-app-text-soft hover:file:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const message = (reason.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  if (reason instanceof ApiError) return `A API respondeu com erro ${reason.status}.`;
  return reason instanceof Error ? reason.message : 'Não foi possível atualizar as imagens.';
}

export function DevOpsTicketImagesPanel({ ticketId }: { ticketId: number }) {
  const [images, setImages] = useState<TicketProjectTaskImage[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function reload() {
    const response = await fetchDevOpsTicketImages(ticketId);
    setImages(response.images);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchDevOpsTicketImages(ticketId)
      .then((response) => { if (active) setImages(response.images); })
      .catch((reason) => { if (active) setFeedback(errorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ticketId]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setBusy(true); setFeedback(null);
    try {
      await uploadDevOpsTicketImage(ticketId, file);
      setFile(null);
      await reload();
      setFeedback('Imagem adicionada.');
      event.currentTarget.reset();
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function replace(imageId: number, event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    setBusy(true); setFeedback(null);
    try {
      await replaceDevOpsTicketImage(ticketId, imageId, nextFile);
      await reload();
      setFeedback('Imagem substituída.');
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  async function remove(imageId: number) {
    if (!window.confirm('Excluir esta imagem da tarefa DevOps?')) return;
    setBusy(true); setFeedback(null);
    try {
      await deleteDevOpsTicketImage(ticketId, imageId);
      await reload();
      setFeedback('Imagem excluída.');
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="grid gap-4 rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm shadow-slate-950/5 dark:shadow-black/10"
      aria-label="Imagens do ticket DevOps"
    >
      <div className="flex items-start justify-between gap-4 max-sm:flex-col">
        <div>
          <span className="mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">DevOps</span>
          <h2 className="m-0 text-lg font-bold text-app-text">Imagens da tarefa</h2>
          <p className="mt-1 text-sm text-app-muted">O backend aceita somente JPEG, preservando a regra já migrada.</p>
        </div>
        <strong className="rounded-full bg-app-surface-muted px-3 py-1 text-sm text-app-text-soft">
          {images.length.toLocaleString('pt-BR')}
        </strong>
      </div>

      <form className="flex flex-wrap items-center gap-2.5" onSubmit={upload}>
        <input className={FILE_INPUT_CLASS} accept="image/jpeg,.jpg,.jpeg" disabled={busy} onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
        <button className={BUTTON_CLASS} disabled={busy || !file} type="submit">Adicionar imagem</button>
      </form>

      {feedback ? <p className="m-0 text-sm text-app-muted" role="status">{feedback}</p> : null}
      {loading ? (
        <div className="h-1 overflow-hidden rounded-full bg-app-border" aria-label="Carregando imagens" role="progressbar">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-app-brand" />
        </div>
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5 max-sm:grid-cols-1">
        {images.map((image) => (
          <article className="grid overflow-hidden rounded-xl border border-app-border bg-app-surface-muted" key={image.id}>
            <img className="aspect-[4/3] w-full bg-app-border-soft object-cover" src={devOpsTicketImageContentUrl(ticketId, image.id)} alt={image.name || `Imagem ${image.id}`} />
            <div className="grid gap-1 p-2.5">
              <strong className="text-sm text-app-text">{image.name || `Imagem #${image.id}`}</strong>
              <span className="text-xs text-app-muted">{image.uploadedBy.name || 'Usuário não identificado'} · {formatDate(image.updatedAt)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 px-2.5 pb-2.5">
              <label className={`${BUTTON_CLASS} relative cursor-pointer overflow-hidden`}>
                Substituir
                <input className="absolute h-px w-px opacity-0 pointer-events-none" accept="image/jpeg,.jpg,.jpeg" disabled={busy} onChange={(event) => void replace(image.id, event)} type="file" />
              </label>
              <button className={BUTTON_CLASS} disabled={busy} onClick={() => void remove(image.id)} type="button">Excluir</button>
            </div>
          </article>
        ))}
      </div>

      {!loading && images.length === 0 ? <p className="m-0 text-sm text-app-muted">Nenhuma imagem registrada para esta tarefa.</p> : null}
    </section>
  );
}

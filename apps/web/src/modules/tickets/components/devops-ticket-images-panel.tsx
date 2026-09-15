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
import styles from './devops-ticket-images-panel.module.css';

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
    <section className={styles.card} aria-label="Imagens do ticket DevOps">
      <div className={styles.header}>
        <div><span className="eyebrow">DevOps</span><h2>Imagens da tarefa</h2><p>O backend aceita somente JPEG, preservando a regra já migrada.</p></div>
        <strong>{images.length.toLocaleString('pt-BR')}</strong>
      </div>

      <form className={styles.upload} onSubmit={upload}>
        <input accept="image/jpeg,.jpg,.jpeg" disabled={busy} onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
        <button className="button" disabled={busy || !file} type="submit">Adicionar imagem</button>
      </form>

      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
      {loading ? <div className="loading-line" aria-label="Carregando imagens" /> : null}

      <div className={styles.grid}>
        {images.map((image) => (
          <article className={styles.imageCard} key={image.id}>
            <img className={styles.preview} src={devOpsTicketImageContentUrl(ticketId, image.id)} alt={image.name || `Imagem ${image.id}`} />
            <div className={styles.meta}><strong>{image.name || `Imagem #${image.id}`}</strong><span>{image.uploadedBy.name || 'Usuário não identificado'} · {formatDate(image.updatedAt)}</span></div>
            <div className={styles.actions}>
              <label className={`${styles.replace} button`}>
                Substituir
                <input accept="image/jpeg,.jpg,.jpeg" disabled={busy} onChange={(event) => void replace(image.id, event)} type="file" />
              </label>
              <button className="button" disabled={busy} onClick={() => void remove(image.id)} type="button">Excluir</button>
            </div>
          </article>
        ))}
      </div>

      {!loading && images.length === 0 ? <p className={styles.feedback}>Nenhuma imagem registrada para esta tarefa.</p> : null}
    </section>
  );
}

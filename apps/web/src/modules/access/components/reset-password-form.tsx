"use client";

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { ApiError, apiRequest } from '../../../shared/api/api-client';
import styles from './login-form.module.css';

function apiMessage(error: ApiError): string | null {
  if (!error.body || typeof error.body !== 'object') return null;
  const message = (error.body as Record<string, unknown>).message;
  return typeof message === 'string' ? message : null;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setError('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiRequest<null>('auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      setComplete(true);
    } catch (reason: unknown) {
      setError(
        reason instanceof ApiError
          ? apiMessage(reason) ?? `Não foi possível redefinir a senha (erro ${reason.status}).`
          : 'Não foi possível conectar à API.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brand}>
          <span>Helpdesk</span>
          <strong>Nova senha</strong>
          <p>Use ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo.</p>
        </div>

        {complete ? (
          <div className={styles.success} role="status">Senha alterada com sucesso.</div>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            <label><span>Nova senha</span><input autoComplete="new-password" disabled={submitting} maxLength={100} minLength={12} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
            <label><span>Confirmar nova senha</span><input autoComplete="new-password" disabled={submitting} maxLength={100} minLength={12} onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation} /></label>
            {error ? <div className={styles.error} role="alert">{error}</div> : null}
            <button disabled={submitting || !token} type="submit">{submitting ? 'Salvando…' : 'Salvar nova senha'}</button>
          </form>
        )}
        <Link className={styles.backLink} href="/login">Ir para o login</Link>
      </section>
    </main>
  );
}

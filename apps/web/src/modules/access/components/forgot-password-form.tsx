"use client";

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { ApiError, apiRequest } from '../../../shared/api/api-client';
import styles from './login-form.module.css';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await apiRequest<null>('auth/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (reason: unknown) {
      setError(
        reason instanceof ApiError
          ? `Não foi possível processar a solicitação (erro ${reason.status}).`
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
          <strong>Recuperar senha</strong>
          <p>Informe o e-mail cadastrado para receber um link temporário.</p>
        </div>

        {sent ? (
          <div className={styles.success} role="status">
            Se o e-mail estiver cadastrado e ativo, enviaremos as instruções de recuperação.
          </div>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            <label>
              <span>E-mail</span>
              <input
                autoComplete="email"
                autoFocus
                disabled={submitting}
                maxLength={100}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            {error ? <div className={styles.error} role="alert">{error}</div> : null}
            <button disabled={submitting} type="submit">
              {submitting ? 'Enviando…' : 'Enviar recuperação'}
            </button>
          </form>
        )}

        <Link className={styles.backLink} href="/login">Voltar ao login</Link>
      </section>
    </main>
  );
}

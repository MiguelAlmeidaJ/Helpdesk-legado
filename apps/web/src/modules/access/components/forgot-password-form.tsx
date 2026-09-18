"use client";

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { ApiError, apiRequest } from '../../../shared/api/api-client';
import { authFormStyles } from './auth-form-styles';

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
    <main className={authFormStyles.page}>
      <section className={authFormStyles.card}>
        <div className={authFormStyles.brand}>
          <span className={authFormStyles.brandEyebrow}>Helpdesk</span>
          <strong className={authFormStyles.brandTitle}>Recuperar senha</strong>
          <p className={authFormStyles.brandDescription}>
            Informe o e-mail cadastrado para receber um link temporário.
          </p>
        </div>

        {sent ? (
          <div className={authFormStyles.success} role="status">
            Se o e-mail estiver cadastrado e ativo, enviaremos as instruções de recuperação.
          </div>
        ) : (
          <form className={authFormStyles.form} onSubmit={submit}>
            <label className={authFormStyles.field}>
              <span className={authFormStyles.fieldLabel}>E-mail</span>
              <input
                autoComplete="email"
                autoFocus
                className={authFormStyles.input}
                disabled={submitting}
                maxLength={100}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            {error ? <div className={authFormStyles.error} role="alert">{error}</div> : null}
            <button className={authFormStyles.button} disabled={submitting} type="submit">
              {submitting ? 'Enviando…' : 'Enviar recuperação'}
            </button>
          </form>
        )}

        <Link className={authFormStyles.backLink} href="/login">Voltar ao login</Link>
      </section>
    </main>
  );
}

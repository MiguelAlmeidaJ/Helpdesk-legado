"use client";

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { ApiError, apiRequest } from '../../../shared/api/api-client';
import { authFormStyles } from './auth-form-styles';

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
    <main className={authFormStyles.page}>
      <section className={authFormStyles.card}>
        <div className={authFormStyles.brand}>
          <span className={authFormStyles.brandEyebrow}>Helpdesk</span>
          <strong className={authFormStyles.brandTitle}>Nova senha</strong>
          <p className={authFormStyles.brandDescription}>
            Use ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo.
          </p>
        </div>

        {complete ? (
          <div className={authFormStyles.success} role="status">Senha alterada com sucesso.</div>
        ) : (
          <form className={authFormStyles.form} onSubmit={submit}>
            <label className={authFormStyles.field}>
              <span className={authFormStyles.fieldLabel}>Nova senha</span>
              <input
                autoComplete="new-password"
                className={authFormStyles.input}
                disabled={submitting}
                maxLength={100}
                minLength={12}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <label className={authFormStyles.field}>
              <span className={authFormStyles.fieldLabel}>Confirmar nova senha</span>
              <input
                autoComplete="new-password"
                className={authFormStyles.input}
                disabled={submitting}
                maxLength={100}
                minLength={12}
                onChange={(event) => setConfirmation(event.target.value)}
                required
                type="password"
                value={confirmation}
              />
            </label>
            {error ? <div className={authFormStyles.error} role="alert">{error}</div> : null}
            <button
              className={authFormStyles.button}
              disabled={submitting || !token}
              type="submit"
            >
              {submitting ? 'Salvando…' : 'Salvar nova senha'}
            </button>
          </form>
        )}
        <Link className={authFormStyles.backLink} href="/login">Ir para o login</Link>
      </section>
    </main>
  );
}

"use client";

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { ApiError, apiRequest } from '../../../shared/api/api-client';
import {
  AuthScreenShell,
  authBackLinkClass,
  authControlClass,
  authErrorClass,
  authPrimaryButtonClass,
  authSuccessClass,
} from './auth-screen-shell';

function apiMessage(error: ApiError): string | null {
  if (!error.body || typeof error.body !== 'object') return null;
  const message = (error.body as Record<string, unknown>).message;
  return typeof message === 'string' ? message : null;
}

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
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch (reason: unknown) {
      if (reason instanceof ApiError) {
        setError(
          apiMessage(reason) ??
            (reason.status >= 500
              ? 'O serviço de recuperação está temporariamente indisponível.'
              : 'Não foi possível processar a solicitação (erro ' +
                reason.status +
                ').'),
        );
      } else {
        setError('Não foi possível conectar à API.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreenShell
      description="Informe o e-mail cadastrado para receber um link temporário de redefinição."
      title="Recuperar senha"
    >
      {sent ? (
        <div className="grid gap-5">
          <div className={authSuccessClass} role="status">
            Se o e-mail estiver cadastrado e ativo, enviaremos as instruções de
            recuperação. Verifique também a caixa de spam.
          </div>
          <Link className={authBackLinkClass} href="/login">
            Voltar ao login
          </Link>
        </div>
      ) : (
        <form className="grid gap-[17px]" onSubmit={submit}>
          <label className="grid gap-1.5">
            <span className="text-xs font-extrabold text-[#c9d0cd]">E-mail</span>
            <input
              autoComplete="email"
              autoFocus
              className={authControlClass}
              disabled={submitting}
              maxLength={100}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu.email@empresa.com.br"
              required
              type="email"
              value={email}
            />
          </label>

          {error ? (
            <div className={authErrorClass} role="alert">
              {error}
            </div>
          ) : null}

          <button
            className={authPrimaryButtonClass}
            disabled={submitting}
            type="submit"
          >
            {submitting ? 'Enviando…' : 'Enviar recuperação'}
          </button>

          <div className="flex justify-end">
            <Link className={authBackLinkClass} href="/login">
              Voltar ao login
            </Link>
          </div>
        </form>
      )}
    </AuthScreenShell>
  );
}

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

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : 'O link de recuperação está incompleto ou inválido.',
  );

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
          ? apiMessage(reason) ??
              'Não foi possível redefinir a senha (erro ' +
                reason.status +
                ').'
          : 'Não foi possível conectar à API.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreenShell
      description="Defina uma nova senha segura para voltar a acessar o Helpdesk."
      title="Nova senha"
    >
      {complete ? (
        <div className="grid gap-5">
          <div className={authSuccessClass} role="status">
            Senha alterada com sucesso. Você já pode entrar com a nova senha.
          </div>
          <Link className={authBackLinkClass} href="/login">
            Ir para o login
          </Link>
        </div>
      ) : (
        <form className="grid gap-[17px]" onSubmit={submit}>
          <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2.5 text-xs leading-5 text-[#aeb8b4]">
            Use ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo.
          </div>

          <label className="grid gap-1.5">
            <span className="text-xs font-extrabold text-[#c9d0cd]">
              Nova senha
            </span>
            <input
              autoComplete="new-password"
              className={authControlClass}
              disabled={submitting}
              maxLength={100}
              minLength={12}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-extrabold text-[#c9d0cd]">
              Confirmar nova senha
            </span>
            <input
              autoComplete="new-password"
              className={authControlClass}
              disabled={submitting}
              maxLength={100}
              minLength={12}
              onChange={(event) => setConfirmation(event.target.value)}
              required
              type="password"
              value={confirmation}
            />
          </label>

          {error ? (
            <div className={authErrorClass} role="alert">
              {error}
            </div>
          ) : null}

          <button
            className={authPrimaryButtonClass}
            disabled={submitting || !token}
            type="submit"
          >
            {submitting ? 'Salvando…' : 'Salvar nova senha'}
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

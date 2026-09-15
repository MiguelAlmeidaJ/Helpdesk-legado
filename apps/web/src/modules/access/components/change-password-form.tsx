"use client";

import type { FormEvent } from 'react';
import { useState } from 'react';
import { ApiError, apiRequest } from '../../../shared/api/api-client';
import styles from './login-form.module.css';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmation) {
      setError('As senhas não coincidem.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest<null>('auth/password/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      window.location.replace('/login?passwordChanged=1');
    } catch (reason: unknown) {
      setError(
        reason instanceof ApiError && reason.status === 401
          ? 'A senha atual está incorreta.'
          : reason instanceof ApiError
            ? `Não foi possível alterar a senha (erro ${reason.status}).`
            : 'Não foi possível conectar à API.',
      );
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label><span>Senha atual</span><input autoComplete="current-password" disabled={submitting} maxLength={200} onChange={(event) => setCurrentPassword(event.target.value)} required type="password" value={currentPassword} /></label>
      <label><span>Nova senha</span><input autoComplete="new-password" disabled={submitting} maxLength={100} minLength={12} onChange={(event) => setNewPassword(event.target.value)} required type="password" value={newPassword} /></label>
      <label><span>Confirmar nova senha</span><input autoComplete="new-password" disabled={submitting} maxLength={100} minLength={12} onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation} /></label>
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      <button disabled={submitting} type="submit">{submitting ? 'Salvando…' : 'Alterar senha'}</button>
    </form>
  );
}

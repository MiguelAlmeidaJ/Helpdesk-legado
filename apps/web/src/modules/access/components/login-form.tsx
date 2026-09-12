"use client";

import type { FormEvent } from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { ApiError, apiRequest } from '../../../shared/api/api-client';
import styles from './login-form.module.css';

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await apiRequest('auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login,
          password,
        }),
      });

      window.location.assign(nextPath);
    } catch (reason: unknown) {
      if (reason instanceof ApiError && reason.status === 401) {
        setError('Usuário ou senha inválidos.');
      } else if (reason instanceof ApiError) {
        setError(`Não foi possível entrar. Erro ${reason.status} da API.`);
      } else {
        setError('Não foi possível conectar à API.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brand}>
          <span>Helpdesk</span>
          <strong>Entrar</strong>
          <p>Use o mesmo usuário e senha do Helpdesk atual.</p>
        </div>

        <form className={styles.form} onSubmit={submit}>
          <label>
            <span>Usuário</span>
            <input
              autoComplete="username"
              autoFocus
              disabled={submitting}
              maxLength={100}
              onChange={(event) => setLogin(event.target.value)}
              required
              type="text"
              value={login}
            />
          </label>

          <label>
            <span>Senha</span>
            <input
              autoComplete="current-password"
              disabled={submitting}
              maxLength={200}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <div className={styles.error} role="alert">
              {error}
            </div>
          ) : null}

          <button disabled={submitting} type="submit">
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <Link className={styles.recoveryLink} href="/forgot-password">
          Esqueci minha senha
        </Link>

        <p className={styles.note}>
          O login cria uma sessão segura e própria da nova plataforma.
        </p>
      </section>
    </main>
  );
}

"use client";

import type { FormEvent } from 'react';
import Image from 'next/image';
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
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <div className={styles.loginBrandPanel}>
          <Image
            alt="Helpdesk"
            className={styles.loginHelpdeskLogo}
            height={600}
            priority
            src="/branding/helpdesk-logo-white.png"
            width={1200}
          />

          <div className={styles.loginBrandCopy}>
            <h1>Gestão inteligente para uma operação mais eficiente</h1>
            <p>
              Mais controle, agilidade e visão estratégica, mantendo o fluxo e
              a qualidade operacional sempre em movimento.
            </p>
          </div>
        </div>

        <div className={styles.loginFormPanel}>
          <div className={styles.loginFormHeader}>
            <h2>Acesse sua conta</h2>
            <p>Bem-vindo de volta!</p>
          </div>

          <form className={`${styles.form} ${styles.loginForm}`} onSubmit={submit}>
            <label>
              <span>Usuário ou e-mail</span>
              <input
                autoComplete="username"
                autoFocus
                disabled={submitting}
                maxLength={100}
                onChange={(event) => setLogin(event.target.value)}
                placeholder="Digite seu usuário ou e-mail"
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
                placeholder="Digite sua senha"
                required
                type="password"
                value={password}
              />
            </label>

            {error ? (
              <div className={`${styles.error} ${styles.loginError}`} role="alert">
                {error}
              </div>
            ) : null}

            <div className={styles.loginFormLinks}>
              <Link className={styles.recoveryLink} href="/forgot-password">
                Esqueceu a sua senha?
              </Link>
            </div>

            <button disabled={submitting} type="submit">
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className={styles.loginPartner}>
            <Image
              alt="Nível 3"
              className={styles.loginPartnerLogo}
              height={3863}
              src="/branding/nivel3-logo.png"
              width={8334}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import type { FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, apiRequest } from '../../../shared/api/api-client';
import styles from './login-form.module.css';

const REMEMBERED_LOGIN_KEY = 'helpdesk.rememberedLogin';

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect height="11" rx="2" width="16" x="4" y="10" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {visible ? null : <path d="m4 4 16 16" />}
    </svg>
  );
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [rememberLogin, setRememberLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rememberedLogin = window.localStorage.getItem(REMEMBERED_LOGIN_KEY);
    if (!rememberedLogin) return;
    setLogin(rememberedLogin);
    setRememberLogin(true);
  }, []);

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

      if (rememberLogin) {
        window.localStorage.setItem(REMEMBERED_LOGIN_KEY, login.trim());
      } else {
        window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
      }

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
      <video
        aria-hidden="true"
        autoPlay
        className={styles.loginBackgroundVideo}
        loop
        muted
        playsInline
      >
        <source src="/media/login-background.mp4" type="video/mp4" />
      </video>
      <div aria-hidden="true" className={styles.loginBackdrop} />

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
              Mais controle, agilidade e visão estratégica; mantendo o fluxo e
              a qualidade operacional que mantêm a engrenagem sempre em movimento.
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
              <div className={styles.loginInputShell}>
                <span className={styles.loginInputIcon}><UserIcon /></span>
                <input
                  autoComplete="username"
                  autoFocus={!rememberLogin}
                  disabled={submitting}
                  maxLength={100}
                  onChange={(event) => setLogin(event.target.value)}
                  placeholder="Digite seu usuário ou e-mail"
                  required
                  type="text"
                  value={login}
                />
              </div>
            </label>

            <label>
              <span>Senha</span>
              <div className={styles.loginInputShell}>
                <span className={styles.loginInputIcon}><LockIcon /></span>
                <input
                  autoComplete="current-password"
                  disabled={submitting}
                  maxLength={200}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Digite sua senha"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  className={styles.passwordToggle}
                  disabled={submitting}
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </label>

            {error ? (
              <div className={`${styles.error} ${styles.loginError}`} role="alert">
                {error}
              </div>
            ) : null}

            <div className={styles.loginFormLinks}>
              <label className={styles.rememberLogin}>
                <input
                  checked={rememberLogin}
                  disabled={submitting}
                  onChange={(event) => setRememberLogin(event.target.checked)}
                  type="checkbox"
                />
                <span>Lembrar usuário</span>
              </label>

              <Link className={styles.recoveryLink} href="/forgot-password">
                Esqueceu a sua senha?
              </Link>
            </div>

            <button className={styles.loginSubmit} disabled={submitting} type="submit">
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

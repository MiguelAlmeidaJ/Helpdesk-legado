"use client";

import type { FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, apiRequest } from '../../../shared/api/api-client';

const REMEMBERED_LOGIN_KEY = 'helpdesk.rememberedLogin';

const iconClass = 'h-full w-full';

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      className={iconClass}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      className={iconClass}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      <rect height="11" rx="2" width="16" x="4" y="10" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={iconClass}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
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

  const loginInputClass =
    'min-h-[46px] w-full rounded-[7px] border border-[#444b4e] bg-[rgba(8,11,12,0.58)] py-0 pr-[46px] pl-[42px] text-[#f7f9f8] outline-none transition placeholder:text-[#737c79] focus:border-[#50f68b] focus:ring-3 focus:ring-[rgba(80,246,139,0.12)] disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#111416] p-8 max-[820px]:p-[18px] max-[480px]:place-items-stretch max-[480px]:p-0">
      <video
        aria-hidden="true"
        autoPlay
        className="absolute inset-0 h-full w-full object-cover object-center motion-reduce:hidden"
        loop
        muted
        playsInline
      >
        <source src="/media/login-background.mp4" type="video/mp4" />
      </video>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[rgba(7,10,11,0.68)] [backdrop-filter:saturate(.75)]"
      />

      <section className="relative z-[1] grid min-h-[510px] w-full max-w-[1030px] grid-cols-[1.06fr_0.94fr] overflow-hidden rounded-3xl border border-white/10 bg-[#15191b] shadow-[0_28px_80px_rgba(0,0,0,0.52)] max-[820px]:max-w-[520px] max-[820px]:grid-cols-1 max-[480px]:min-h-screen max-[480px]:rounded-none max-[480px]:border-0">
        <div className="flex flex-col items-center justify-center gap-[38px] bg-linear-to-b from-[#011a1d] to-[#001214] px-[66px] py-[54px] text-center max-[820px]:gap-[18px] max-[820px]:px-9 max-[820px]:py-[30px] max-[480px]:px-7 max-[480px]:py-6">
          <Image
            alt="Helpdesk"
            className="h-auto w-full max-w-[365px] max-[820px]:max-w-[290px]"
            height={600}
            priority
            src="/branding/helpdesk-logo-white.png"
            width={1200}
          />

          <div className="max-w-[430px] max-[480px]:hidden">
            <h1 className="m-0 text-[clamp(22px,2.25vw,27px)] leading-[1.08] font-bold text-[#f5f8f6] max-[820px]:text-[21px]">
              Gestão inteligente para uma operação mais eficiente
            </h1>
            <p className="mt-4 mb-0 text-[15px] leading-[1.58] text-[#b8c0bd] max-[820px]:hidden">
              Mais controle, agilidade e visão estratégica; mantendo o fluxo e
              a qualidade operacional que mantêm a engrenagem sempre em movimento.
            </p>
          </div>
        </div>

        <div className="flex flex-col bg-linear-to-b from-[#1f2325] to-[#0e1113] px-[50px] pt-[52px] pb-[34px] text-[#f7f9f8] max-[820px]:px-[30px] max-[820px]:pt-[34px] max-[820px]:pb-7 max-[480px]:px-6 max-[480px]:pt-8 max-[480px]:pb-[26px]">
          <div>
            <h2 className="m-0 text-[clamp(29px,3vw,36px)] leading-[1.05] font-bold">
              Acesse sua conta
            </h2>
            <p className="mt-2.5 mb-0 text-[15px] text-[#939d99]">Bem-vindo de volta!</p>
          </div>

          <form className="mt-[30px] grid gap-[17px]" onSubmit={submit}>
            <label className="grid gap-1.5">
              <span className="text-xs font-extrabold text-[#c9d0cd]">Usuário ou e-mail</span>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-[13px] z-[1] h-[18px] w-[18px] -translate-y-1/2 text-[#818a87]">
                  <UserIcon />
                </span>
                <input
                  autoComplete="username"
                  autoFocus={!rememberLogin}
                  className={loginInputClass}
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

            <label className="grid gap-1.5">
              <span className="text-xs font-extrabold text-[#c9d0cd]">Senha</span>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-[13px] z-[1] h-[18px] w-[18px] -translate-y-1/2 text-[#818a87]">
                  <LockIcon />
                </span>
                <input
                  autoComplete="current-password"
                  className={loginInputClass}
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
                  className="absolute top-1/2 right-2 z-[1] grid size-[34px] -translate-y-1/2 place-items-center border-0 bg-transparent p-2 text-[#818a87] transition hover:bg-transparent hover:text-[#d0d7d4] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={submitting}
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </label>

            {error ? (
              <div
                className="rounded-lg border border-[rgba(255,120,120,0.28)] bg-[rgba(130,34,34,0.2)] px-3 py-2.5 text-[13px] text-[#ffcaca]"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <div className="flex min-h-6 items-center justify-between gap-[18px] max-[480px]:items-start">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[#929b98]">
                <input
                  checked={rememberLogin}
                  className="m-0 size-[13px] min-h-[13px] accent-[#50f68b] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={submitting}
                  onChange={(event) => setRememberLogin(event.target.checked)}
                  type="checkbox"
                />
                <span className="text-xs font-medium text-[#929b98]">Lembrar usuário</span>
              </label>

              <Link
                className="text-xs font-bold text-[#50f68b] hover:text-[#6ff89d] hover:underline"
                href="/forgot-password"
              >
                Esqueceu a sua senha?
              </Link>
            </div>

            <button
              className="min-h-[46px] rounded-[7px] border border-[#50f68b] bg-[#50f68b] px-4 text-[15px] font-extrabold text-[#07120b] transition hover:bg-[#6ff89d] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className="mt-auto flex justify-center pt-[30px]">
            <Image
              alt="Nível 3"
              className="h-auto w-[68px]"
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

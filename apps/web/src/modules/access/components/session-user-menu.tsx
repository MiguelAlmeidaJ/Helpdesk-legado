"use client";

import {
  USER_ROLE_LABELS,
  type CurrentUserResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ApiError, apiRequest } from '../../../shared/api/api-client';
import { ThemeToggle } from '../../../shared/theme/theme-toggle';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';

  return `${first}${last}`.toUpperCase();
}

export function SessionUserMenu({ user }: { user: CurrentUserResponse }) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleLabel = useMemo(() => {
    const labels = Array.from(
      new Set(
        user.roleAssignments.map(
          (assignment) => USER_ROLE_LABELS[assignment.role],
        ),
      ),
    );

    if (labels.length > 0) {
      return labels.join(' · ');
    }

    return user.accessSource === 'legacy'
      ? 'Permissões legadas'
      : 'Acesso personalizado';
  }, [user.accessSource, user.roleAssignments]);

  async function logout() {
    setLoggingOut(true);
    setError(null);

    try {
      await apiRequest<null>('auth/logout', {
        method: 'POST',
      });

      window.location.replace('/login');
    } catch (reason: unknown) {
      if (reason instanceof ApiError) {
        setError(`Não foi possível encerrar a sessão (erro ${reason.status}).`);
      } else {
        setError('Não foi possível conectar à API para encerrar a sessão.');
      }

      setLoggingOut(false);
    }
  }

  const actionClass =
    'mt-2.5 flex min-h-[38px] w-full cursor-pointer items-center justify-center rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm font-extrabold text-app-text-soft no-underline transition-colors hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <details className="group relative">
      <summary className="flex min-h-[42px] cursor-pointer list-none items-center gap-[9px] rounded-[10px] border border-app-border bg-app-surface py-1 pl-[5px] pr-2 transition-colors hover:bg-app-surface-hover">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-app-brand-soft text-[11px] font-black text-app-brand"
          aria-hidden="true"
        >
          {initials(user.name)}
        </span>
        <span className="grid min-w-0 gap-px text-left">
          <strong className="max-w-[190px] overflow-hidden text-ellipsis whitespace-nowrap text-xs">
            {user.name}
          </strong>
          <small className="max-w-[190px] overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-app-subtle">
            {roleLabel}
          </small>
        </span>
        <span
          className="text-[13px] text-app-subtle transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        >
          ⌄
        </span>
      </summary>

      <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(300px,calc(100vw-28px))] rounded-xl border border-app-border bg-app-surface p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.38)]">
        <div className="grid gap-[3px] border-b border-app-border-soft px-1 pb-3 pt-1">
          <strong className="text-[13px]">{user.name}</strong>
          <span className="text-[11px] text-app-muted">@{user.login}</span>
          <small className="text-[11px] text-app-muted">{roleLabel}</small>
        </div>

        <ThemeToggle />

        {error ? (
          <div
            className="mt-2.5 rounded-lg border border-app-danger-border bg-app-danger-soft px-[9px] py-2 text-xs text-app-danger"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <Link className={actionClass} href="/account/password">
          Alterar senha
        </Link>

        <button className={actionClass} disabled={loggingOut} onClick={logout} type="button">
          {loggingOut ? 'Saindo…' : 'Sair'}
        </button>
      </div>
    </details>
  );
}

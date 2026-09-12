"use client";

import {
  USER_ROLE_LABELS,
  type CurrentUserResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ApiError, apiRequest } from '../../../shared/api/api-client';
import styles from './session-user-menu.module.css';

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

  return (
    <details className={styles.menu}>
      <summary className={styles.summary}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(user.name)}
        </span>
        <span className={styles.identity}>
          <strong>{user.name}</strong>
          <small>{roleLabel}</small>
        </span>
        <span className={styles.chevron} aria-hidden="true">⌄</span>
      </summary>

      <div className={styles.popover}>
        <div className={styles.account}>
          <strong>{user.name}</strong>
          <span>@{user.login}</span>
          <small>{roleLabel}</small>
        </div>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}

        <Link className={styles.actionLink} href="/account/password">
          Alterar senha
        </Link>

        <button disabled={loggingOut} onClick={logout} type="button">
          {loggingOut ? 'Saindo…' : 'Sair'}
        </button>
      </div>
    </details>
  );
}

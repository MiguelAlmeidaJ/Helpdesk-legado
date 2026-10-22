"use client";

import type { AccessPermissionItem, CurrentUserResponse } from '@helpdesk/contracts';
import { useEffect, useMemo, useState } from 'react';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { fetchAccessManagement } from '../api/access-management-api';

export function PermissionCatalogScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const [permissions, setPermissions] = useState<AccessPermissionItem[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetchAccessManagement(controller.signal).then((snapshot) => setPermissions(snapshot.permissions)).catch((reason: unknown) => {
      if (reason instanceof Error && reason.name !== 'AbortError') setError('Não foi possível carregar o catálogo de permissões.');
    });
    return () => controller.abort();
  }, []);
  const groups = useMemo(() => {
    const result = new Map<string, AccessPermissionItem[]>();
    for (const permission of permissions) result.set(permission.module, [...(result.get(permission.module) ?? []), permission]);
    return [...result.entries()];
  }, [permissions]);
  return <main className="min-h-screen bg-app-bg text-app-text">
    <AppPageHeader subtitle="Consulta das permissões disponíveis no sistema. A atribuição é feita em Funções de usuários." title="Catálogo de permissões" user={currentUser} />
    <div className="mx-auto grid w-full max-w-[1250px] gap-4 p-6 max-sm:px-3.5">
      {error ? <div className="rounded-lg border border-app-danger-border bg-app-danger-soft p-3 text-app-danger" role="alert">{error}</div> : null}
      {groups.map(([module, entries]) => <section className="overflow-hidden rounded-xl border border-app-border bg-app-surface" key={module}>
        <h2 className="border-b border-app-border bg-app-surface-muted px-4 py-3 text-lg font-extrabold">{module}</h2>
        <div className="grid gap-px bg-app-border md:grid-cols-2">{entries.map((permission) => <article className="bg-app-surface p-4" key={permission.id}><strong>{permission.name}</strong><p className="mt-1 text-sm text-app-muted">{permission.description ?? permission.slug}</p><code className="mt-2 block text-xs text-app-muted">{permission.slug}</code></article>)}</div>
      </section>)}
    </div>
  </main>;
}

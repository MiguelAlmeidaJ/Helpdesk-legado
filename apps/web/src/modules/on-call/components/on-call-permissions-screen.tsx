"use client";

import type { AccessPermissionItem, CurrentUserResponse } from '@helpdesk/contracts';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { fetchAccessManagement } from '../../access/api/access-management-api';
import { apiRequest } from '../../../shared/api/api-client';

export function OnCallPermissionsScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const [permissions, setPermissions] = useState<AccessPermissionItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchAccessManagement(controller.signal),
      apiRequest<number[]>('administration/on-call/plantonista-permissions', { signal: controller.signal }),
    ]).then(([catalog, ids]) => {
      setPermissions(catalog.permissions);
      setSelected(ids);
    }).catch((reason: unknown) => {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setError('Não foi possível carregar as permissões do plantão.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const groups = useMemo(() => {
    const grouped = new Map<string, AccessPermissionItem[]>();
    for (const permission of permissions) grouped.set(permission.module, [...(grouped.get(permission.module) ?? []), permission]);
    return [...grouped.entries()];
  }, [permissions]);

  async function save() {
    setSaving(true); setError(''); setMessage('');
    try {
      await apiRequest<void>('administration/on-call/plantonista-permissions', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds: selected }),
      });
      setMessage('Permissões do perfil plantonista atualizadas.');
    } catch {
      setError('Não foi possível salvar as permissões. Verifique o log da API.');
    } finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-app-bg text-app-text">
    <AppPageHeader title="Permissões do Plantão" subtitle="Defina os acessos temporários do perfil Plantonista." user={currentUser}
      actions={<Link className="rounded-lg border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold" href="/qualidade/plantao">Voltar ao plantão</Link>} />
    <div className="mx-auto max-w-[1150px] space-y-4 px-5 py-6">
      <div className="rounded-xl border border-app-border bg-app-surface p-4">
        <strong>Perfil Plantonista</strong>
        <p className="mt-1 text-sm text-app-muted">Essas permissões são concedidas temporariamente durante a janela ativa da escala para TI e DevOps. Não alteram as funções permanentes.</p>
        <span className="text-sm font-semibold">{selected.length} permissões selecionadas</span>
      </div>
      {loading ? <p>Carregando permissões…</p> : null}
      {error ? <p className="rounded-lg bg-app-danger-soft p-3 text-app-danger" role="alert">{error}</p> : null}
      {message ? <p className="rounded-lg bg-app-success-soft p-3 text-app-success" role="status">{message}</p> : null}
      {groups.map(([name, items]) => <section key={name} className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b border-app-border bg-app-surface-muted px-4 py-3">
          <strong>{name} · {items.filter((p) => selected.includes(p.id)).length}/{items.length}</strong>
          <button type="button" className="rounded-lg border border-app-border-strong px-3 py-2 text-xs font-semibold"
            onClick={() => setSelected((current) => {
              const next = new Set(current);
              const all = items.every((p) => next.has(p.id));
              for (const p of items) all ? next.delete(p.id) : next.add(p.id);
              return [...next];
            })}>Selecionar/desmarcar módulo</button>
        </header>
        <div className="grid gap-px bg-app-border md:grid-cols-2">{items.map((permission) => <label key={permission.id} className="flex cursor-pointer items-start gap-3 bg-app-surface p-4 hover:bg-app-surface-hover">
          <input className="mt-1 size-4" type="checkbox" disabled={saving} checked={selected.includes(permission.id)}
            onChange={() => setSelected((current) => current.includes(permission.id) ? current.filter((id) => id !== permission.id) : [...current, permission.id])} />
          <span><strong className="block text-sm">{permission.name}</strong><small className="text-xs text-app-muted">{permission.description ?? permission.slug}</small></span>
        </label>)}</div>
      </section>)}
      <div className="sticky bottom-4 flex justify-end rounded-xl border border-app-border bg-app-surface p-3 shadow-xl">
        <button type="button" disabled={loading || saving} onClick={() => void save()} className="rounded-lg bg-app-brand px-6 py-2.5 font-bold text-white disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar permissões'}</button>
      </div>
    </div>
  </main>;
}

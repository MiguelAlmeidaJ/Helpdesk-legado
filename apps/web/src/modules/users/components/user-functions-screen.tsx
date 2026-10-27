"use client";

import type { AccessPermissionItem, CurrentUserResponse, UserFunctionSummary } from '@helpdesk/contracts';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { appButtonClass } from '../../../shared/ui/button-styles';
import {
  createUserFunction,
  deleteUserFunction,
  fetchUserFunctions,
  fetchUserFunctionPermissions,
  updateUserFunction,
} from '../api/user-functions-api';

const BUTTON = appButtonClass('secondary');
const PRIMARY = appButtonClass('primary');

const styles = {
  page: 'min-h-screen bg-app-bg text-app-text',
  content: 'mx-auto w-full max-w-[1550px] p-6 max-sm:px-3.5',
  layout: 'grid items-start gap-4 lg:grid-cols-[minmax(300px,0.8fr)_minmax(600px,1.7fr)]',
  card: 'rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10',
  list: 'grid max-h-[calc(100vh-220px)] gap-2 overflow-y-auto pr-1',
  item: 'w-full rounded-lg border border-app-border bg-app-surface px-4 py-3.5 text-left transition hover:border-app-brand hover:bg-app-surface-hover data-[active=true]:border-app-brand data-[active=true]:bg-app-brand-soft',
  itemTop: 'flex items-start justify-between gap-3',
  meta: 'mt-1 text-xs text-app-muted',
  badge: 'rounded-full bg-app-surface-muted px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-app-muted',
  form: 'grid gap-4 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-xs [&_label]:font-extrabold [&_label]:text-app-muted [&_input]:min-h-10 [&_input]:rounded-lg [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-3 [&_input]:text-app-text [&_select]:min-h-10 [&_select]:rounded-lg [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-3 [&_select]:text-app-text',
  stats: 'grid grid-cols-2 gap-3 rounded-lg bg-app-surface-muted p-3 [&_div]:grid [&_strong]:text-xl [&_span]:text-xs [&_span]:text-app-muted',
  module: 'overflow-hidden rounded-lg border border-app-border',
  moduleHeader: 'flex items-center justify-between gap-3 border-b border-app-border bg-app-surface-muted px-3 py-2.5',
  permissionGrid: 'grid gap-px bg-app-border xl:grid-cols-2',
  permission: 'flex cursor-pointer items-center gap-3 bg-app-surface px-4 py-3.5 text-sm hover:bg-app-surface-hover [&_input]:size-4 [&_input]:shrink-0 [&_span]:grid [&_small]:text-xs [&_small]:font-normal [&_small]:text-app-muted',
  actions: 'flex flex-wrap justify-end gap-2',
  error: 'mb-3 rounded-lg border border-app-danger-border bg-app-danger-soft px-3 py-3 text-sm text-app-danger',
  success: 'mb-3 rounded-lg border border-emerald-300/70 bg-emerald-50 px-3 py-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200',
} as const;

type FormState = { name: string; status: 1 | 2; permissionIds: number[] };
const EMPTY: FormState = { name: '', status: 1, permissionIds: [] };

function permissionGroups(permissions: AccessPermissionItem[]) {
  const groups = new Map<string, AccessPermissionItem[]>();
  for (const permission of permissions) groups.set(permission.module, [...(groups.get(permission.module) ?? []), permission]);
  return [...groups.entries()];
}

function apiMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object') {
    const value = (error.body as Record<string, unknown>).message;
    if (typeof value === 'string') return value;
  }
  if (error instanceof ApiError) return `A API respondeu com erro ${error.status}.`;
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
}

export function UserFunctionsScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const [functions, setFunctions] = useState<UserFunctionSummary[]>([]);
  const [permissions, setPermissions] = useState<AccessPermissionItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selected = functions.find((entry) => entry.id === selectedId) ?? null;

  async function load(preferredId?: number, signal?: AbortSignal) {
    setLoading(true);
    setError('');
    try {
      const [rows, availablePermissions] = await Promise.all([
        fetchUserFunctions(signal), fetchUserFunctionPermissions(signal),
      ]);
      setFunctions(rows);
      setPermissions(availablePermissions);
      const id = preferredId ?? selectedId;
      if (id) {
        const item = rows.find((row) => row.id === id);
        if (item) {
          setSelectedId(item.id);
          setForm({ name: item.name, status: item.status, permissionIds: item.permissionIds });
        } else {
          setSelectedId(null);
          setForm(EMPTY);
        }
      }
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setError(apiMessage(reason));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(undefined, controller.signal);
    return () => controller.abort();
  }, []);

  function select(item: UserFunctionSummary) {
    setSelectedId(item.id);
    setForm({ name: item.name, status: item.status, permissionIds: item.permissionIds });
    setError('');
    setSuccess('');
  }

  function createNew() {
    setSelectedId(null);
    setForm(EMPTY);
    setError('');
    setSuccess('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const editing = Boolean(selectedId);
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const input = { name: form.name.trim(), status: form.status, permissionIds: form.permissionIds };
      const result = selectedId
        ? await updateUserFunction(selectedId, input)
        : await createUserFunction(input);
      await load(result.id);
      setSuccess(editing ? 'Função atualizada.' : 'Função criada.');
    } catch (reason) {
      setError(apiMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selected) return;
    if (selected.linkedUserCount > 0) {
      setError('Esta função ainda possui usuários vinculados e não pode ser excluída.');
      return;
    }
    if (!window.confirm(`Excluir a função "${selected.name}"?`)) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await deleteUserFunction(selected.id);
      setSelectedId(null);
      setForm(EMPTY);
      await load();
      setSuccess('Função excluída.');
    } catch (reason) {
      setError(apiMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return <main className={styles.page}>
    <AppPageHeader
      actions={<button className={PRIMARY} onClick={createNew} type="button">Nova função</button>}
      subtitle="Crie, edite e acompanhe as funções usadas no cadastro de usuários."
      title="Funções de usuários"
      user={currentUser}
    />
    <div className={styles.content}>
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {success ? <div className={styles.success} role="status">{success}</div> : null}
      <div className={styles.layout}>
        <section className={styles.card}>
          <h2 className="mb-1 text-lg font-extrabold">Funções cadastradas</h2>
          <p className="mb-4 text-sm text-app-muted">Veja quantos usuários ativos utilizam cada função.</p>
          <input aria-label="Buscar função" className="mb-3 min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm" placeholder="Buscar função..." value={search} onChange={(event) => setSearch(event.target.value)} />
          {loading && functions.length === 0 ? <p className="text-sm text-app-muted">Carregando…</p> : null}
          <div className={styles.list}>
            {functions.filter((item) => item.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).map((item) => <button className={styles.item} data-active={selectedId === item.id} key={item.id} onClick={() => select(item)} type="button">
              <span className={styles.itemTop}><strong>{item.name}</strong><span className={styles.badge}>{item.status === 1 ? 'Ativa' : 'Inativa'}</span></span>
              <span className={styles.meta}>{item.activeUserCount} {item.activeUserCount === 1 ? 'usuário ativo' : 'usuários ativos'} · {item.permissionIds.length} permissões</span>
            </button>)}
          </div>
        </section>

        <section className={styles.card}>
          <h2 className="mb-1 text-xl font-extrabold">{selected ? selected.name : 'Nova função'}</h2>
          <p className="mb-4 text-sm text-app-muted">Funções inativas deixam de aparecer para novos vínculos, mas continuam identificando usuários já cadastrados.</p>
          <form className={styles.form} onSubmit={save}>
            <label><span>Nome</span><input disabled={saving} maxLength={50} onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} /></label>
            <label><span>Situação</span><select disabled={saving} onChange={(event) => setForm({ ...form, status: Number(event.target.value) as 1 | 2 })} value={form.status}><option value={1}>Ativa</option><option value={2}>Inativa</option></select></label>
            {permissionGroups(permissions).map(([module, entries]) => {
              const selectedCount = entries.filter((permission) => form.permissionIds.includes(permission.id)).length;
              return <section className={styles.module} key={module}>
                <div className={styles.moduleHeader}><strong>{module} <span className="text-xs text-app-muted">{selectedCount}/{entries.length}</span></strong><button className={BUTTON} disabled={saving} onClick={() => setForm((current) => { const next = new Set(current.permissionIds); const all = entries.every((permission) => next.has(permission.id)); entries.forEach((permission) => all ? next.delete(permission.id) : next.add(permission.id)); return { ...current, permissionIds: [...next] }; })} type="button">{selectedCount === entries.length ? 'Desmarcar módulo' : 'Selecionar módulo'}</button></div>
                <div className={styles.permissionGrid}>{entries.map((permission) => <label className={styles.permission} key={permission.id}><input checked={form.permissionIds.includes(permission.id)} disabled={saving} onChange={() => setForm((current) => ({ ...current, permissionIds: current.permissionIds.includes(permission.id) ? current.permissionIds.filter((id) => id !== permission.id) : [...current.permissionIds, permission.id] }))} type="checkbox" /><span><strong>{permission.name}</strong><small>{permission.description ?? permission.slug}</small></span></label>)}</div>
              </section>;
            })}
            {selected ? <div className={styles.stats}><div><strong>{selected.activeUserCount}</strong><span>Usuários ativos</span></div><div><strong>{selected.linkedUserCount}</strong><span>Usuários vinculados</span></div></div> : null}
            <div className={styles.actions}>
              {selected ? <button className={BUTTON} disabled={saving || selected.linkedUserCount > 0} onClick={() => void remove()} title={selected.linkedUserCount > 0 ? 'Remova os vínculos antes de excluir.' : undefined} type="button">Excluir função</button> : null}
              <button className={PRIMARY} disabled={saving || !form.name.trim()} type="submit">{saving ? 'Salvando…' : selected ? 'Salvar alterações' : 'Criar função'}</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  </main>;
}

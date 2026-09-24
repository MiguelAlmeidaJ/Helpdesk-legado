"use client";

import type { CurrentUserResponse, UserFunctionSummary } from '@helpdesk/contracts';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import {
  createUserFunction,
  deleteUserFunction,
  fetchUserFunctions,
  updateUserFunction,
} from '../api/user-functions-api';

const BUTTON =
  'inline-flex min-h-10 items-center justify-center rounded-[9px] border border-app-border-strong bg-app-surface px-4 font-bold text-app-text transition hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY =
  `${BUTTON} border-app-brand bg-app-brand text-app-brand-contrast hover:bg-app-brand-hover`;

const styles = {
  page: 'min-h-screen bg-app-bg text-app-text',
  content: 'mx-auto w-full max-w-[1250px] p-6 max-sm:px-3.5',
  layout: 'grid items-start gap-4 min-[900px]:grid-cols-[minmax(310px,0.8fr)_minmax(480px,1.3fr)]',
  card: 'rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10',
  list: 'grid max-h-[690px] gap-2 overflow-y-auto',
  item: 'w-full rounded-lg border border-app-border bg-app-surface px-3 py-3 text-left transition hover:border-app-brand hover:bg-app-surface-hover data-[active=true]:border-app-brand data-[active=true]:bg-app-brand-soft',
  itemTop: 'flex items-start justify-between gap-3',
  meta: 'mt-1 text-xs text-app-muted',
  badge: 'rounded-full bg-app-surface-muted px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-app-muted',
  form: 'grid gap-4 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-xs [&_label]:font-extrabold [&_label]:text-app-muted [&_input]:min-h-10 [&_input]:rounded-lg [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-3 [&_input]:text-app-text [&_select]:min-h-10 [&_select]:rounded-lg [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-3 [&_select]:text-app-text',
  stats: 'grid grid-cols-2 gap-3 rounded-lg bg-app-surface-muted p-3 [&_div]:grid [&_strong]:text-xl [&_span]:text-xs [&_span]:text-app-muted',
  actions: 'flex flex-wrap justify-end gap-2',
  error: 'mb-3 rounded-lg border border-app-danger-border bg-app-danger-soft px-3 py-3 text-sm text-app-danger',
  success: 'mb-3 rounded-lg border border-emerald-300/70 bg-emerald-50 px-3 py-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200',
} as const;

type FormState = { name: string; status: 1 | 2 };
const EMPTY: FormState = { name: '', status: 1 };

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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selected = functions.find((entry) => entry.id === selectedId) ?? null;

  async function load(preferredId?: number, signal?: AbortSignal) {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchUserFunctions(signal);
      setFunctions(rows);
      const id = preferredId ?? selectedId;
      if (id) {
        const item = rows.find((row) => row.id === id);
        if (item) {
          setSelectedId(item.id);
          setForm({ name: item.name, status: item.status });
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
    setForm({ name: item.name, status: item.status });
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
      const input = { name: form.name.trim(), status: form.status };
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
          {loading && functions.length === 0 ? <p className="text-sm text-app-muted">Carregando…</p> : null}
          <div className={styles.list}>
            {functions.map((item) => <button className={styles.item} data-active={selectedId === item.id} key={item.id} onClick={() => select(item)} type="button">
              <span className={styles.itemTop}><strong>{item.name}</strong><span className={styles.badge}>{item.status === 1 ? 'Ativa' : 'Inativa'}</span></span>
              <span className={styles.meta}>{item.activeUserCount} {item.activeUserCount === 1 ? 'usuário ativo' : 'usuários ativos'} · {item.linkedUserCount} vínculo(s)</span>
            </button>)}
          </div>
        </section>

        <section className={styles.card}>
          <h2 className="mb-1 text-xl font-extrabold">{selected ? selected.name : 'Nova função'}</h2>
          <p className="mb-4 text-sm text-app-muted">Funções inativas deixam de aparecer para novos vínculos, mas continuam identificando usuários já cadastrados.</p>
          <form className={styles.form} onSubmit={save}>
            <label><span>Nome</span><input disabled={saving} maxLength={50} onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} /></label>
            <label><span>Situação</span><select disabled={saving} onChange={(event) => setForm({ ...form, status: Number(event.target.value) as 1 | 2 })} value={form.status}><option value={1}>Ativa</option><option value={2}>Inativa</option></select></label>
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

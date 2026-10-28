"use client";

import type { CurrentUserResponse, UserFunctionInput, UserFunctionSummary } from '@helpdesk/contracts';
import { useEffect, useMemo, useState } from 'react';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { NavigationIcon } from '../../../shared/navigation/navigation-icon';
import { appButtonClass } from '../../../shared/ui/button-styles';
import { createUserFunction, deleteUserFunction, fetchUserFunctionActiveUsers, fetchUserFunctionPermissions, fetchUserFunctions, updateUserFunction } from '../api/user-functions-api';
import { UserFunctionEditor } from './user-function-editor';
import { UserFunctionMembers } from './user-function-members';
import { functionApiMessage, userInitials } from './user-function-utils';

async function loadData(signal?: AbortSignal) {
  const [functions, permissions, members] = await Promise.all([
    fetchUserFunctions(signal), fetchUserFunctionPermissions(signal), fetchUserFunctionActiveUsers(signal),
  ]);
  return { functions: functions.sort((a, b) => a.status - b.status || a.name.localeCompare(b.name, 'pt-BR')), permissions, members };
}
type Data = Awaited<ReturnType<typeof loadData>>;
type Selection = number | 'unassigned' | null;
const CARD = 'rounded-2xl border border-app-border bg-app-surface shadow-sm shadow-slate-950/[0.025]';
const SECONDARY = appButtonClass('secondary');
const PRIMARY = appButtonClass('primary');

export function UserFunctionsScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const [data, setData] = useState<Data | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [editor, setEditor] = useState<number | 'new' | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal).then(value => { if (!controller.signal.aborted) setData(value); }).catch(reason => {
      if (!controller.signal.aborted) setError(functionApiMessage(reason));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function reload() {
    setLoading(true); setError('');
    try { setData(await loadData()); } catch (reason) { setError(functionApiMessage(reason)); } finally { setLoading(false); }
  }
  const membersByFunction = useMemo(() => {
    const groups = new Map<number | null, NonNullable<Data>['members']['users']>();
    for (const user of data?.members.users ?? []) {
      const group = groups.get(user.functionId) ?? []; group.push(user); groups.set(user.functionId, group);
    }
    return groups;
  }, [data?.members.users]);
  const functions = data?.functions ?? [];
  const selected = typeof selection === 'number' ? functions.find(item => item.id === selection) : undefined;
  const isUnassigned = selection === 'unassigned';
  const hasDetails = Boolean(selected) || isUnassigned;
  const editorInitial = typeof editor === 'number' ? functions.find(item => item.id === editor) ?? null : null;
  const query = search.trim().toLocaleLowerCase('pt-BR');
  const filtered = functions.filter(item => (!query || item.name.toLocaleLowerCase('pt-BR').includes(query)) && (status === 'all' || String(item.status) === status));
  const selectedMembers = membersByFunction.get(isUnassigned ? null : selected?.id ?? -1) ?? [];
  const selectedPermissions = data?.permissions.filter(permission => selected?.permissionIds.includes(permission.id)) ?? [];
  const count = (value: number | undefined) => value === undefined ? '—' : value.toLocaleString('pt-BR');

  async function save(input: UserFunctionInput) {
    const result = typeof editor === 'number' ? await updateUserFunction(editor, input) : await createUserFunction(input);
    setSuccess(editor === 'new' ? 'Função criada com sucesso.' : 'Função atualizada com sucesso.');
    setEditor(null); setSelection(result.id); await reload();
  }
  async function remove(target: UserFunctionSummary) {
    if (target.isGlobalAdmin || target.activeUserCount > 0) return;
    const note = target.linkedUserCount > 0 ? ` Os ${target.linkedUserCount} cadastros vinculados serão preservados e ficarão sem função.` : '';
    if (!window.confirm(`Excluir a função "${target.name}"?${note}`)) return;
    setDeleting(true); setError('');
    try {
      await deleteUserFunction(target.id);
      setEditor(null); setSelection(null); setSuccess('Função excluída. Os cadastros de usuários foram preservados.'); await reload();
    } finally { setDeleting(false); }
  }

  return <main className="min-h-screen bg-app-bg text-app-text max-sm:[&>header]:flex-wrap max-sm:[&>header]:gap-2 max-sm:[&>header>div:last-child]:w-full">
    <AppPageHeader title="Funções de usuários" subtitle="Organize permissões e acompanhe os usuários de cada função." user={currentUser} actions={<button type="button" className={`${PRIMARY} max-sm:hidden`} disabled={loading || !data} onClick={() => { setEditor('new'); setSuccess(''); }}>+ Nova função</button>} />
    <div className="mx-auto grid w-full max-w-[1550px] gap-6 px-6 py-7 max-sm:px-3.5">
      <div className="flex justify-end sm:hidden"><button type="button" className={PRIMARY} disabled={loading || !data} onClick={() => { setEditor('new'); setSuccess(''); }}>+ Nova função</button></div>
      {error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-app-danger-border bg-app-danger-soft p-4 text-sm text-app-danger"><span>{error}</span><button type="button" className={SECONDARY} disabled={loading} onClick={() => void reload()}>Tentar novamente</button></div> : null}
      {success ? <p role="status" className="m-0 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{success}</p> : null}
      <section aria-label="Resumo de funções e usuários" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`${CARD} flex items-start justify-between gap-3 p-5`}><div><p className="m-0 text-xs font-semibold text-app-muted">Funções cadastradas</p><strong className="mt-2 block text-3xl font-extrabold tracking-tight">{count(data ? functions.length : undefined)}</strong><p className="mb-0 mt-2 text-xs text-app-muted">{count(data ? functions.filter(item => item.status === 1).length : undefined)} ativas para novas atribuições</p></div><span className="rounded-xl bg-app-brand-soft p-2.5 text-app-brand"><NavigationIcon name="shield" className="size-5" /></span></div>
        <div className={`${CARD} flex items-start justify-between gap-3 p-5`}><div><p className="m-0 text-xs font-semibold text-app-muted">Usuários ativos</p><strong className="mt-2 block text-3xl font-extrabold tracking-tight">{count(data?.members.activeUserCount)}</strong><p className="mb-0 mt-2 text-xs text-app-muted">Todos os cadastros em atividade</p></div><span className="rounded-xl bg-app-surface-muted p-2.5 text-app-muted"><NavigationIcon name="users" className="size-5" /></span></div>
        <div className={`${CARD} flex items-start justify-between gap-3 p-5`}><div><p className="m-0 text-xs font-semibold text-app-muted">Ativos com função</p><strong className="mt-2 block text-3xl font-extrabold tracking-tight">{count(data?.members.assignedActiveUserCount)}</strong><p className="mb-0 mt-2 text-xs text-app-muted">Vinculados a uma função cadastrada</p></div><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><NavigationIcon name="list" className="size-5" /></span></div>
        <button type="button" aria-label="Ver usuários ativos sem função" aria-pressed={isUnassigned} disabled={!data} onClick={() => setSelection(isUnassigned ? null : 'unassigned')} className={`${CARD} flex items-start justify-between gap-3 border-amber-300/80 p-5 text-left transition hover:bg-amber-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-brand dark:border-amber-800 dark:hover:bg-amber-950/20 ${isUnassigned ? 'ring-2 ring-amber-400/50' : ''}`}><div><p className="m-0 text-xs font-semibold text-app-muted">Ativos sem função</p><strong className="mt-2 block text-3xl font-extrabold tracking-tight text-amber-700 dark:text-amber-300">{count(data?.members.unassignedActiveUserCount)}</strong><p className="mb-0 mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">Ver usuários e revisar vínculos →</p></div><span className="rounded-xl bg-amber-50 p-2.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><NavigationIcon name="users" className="size-5" /></span></button>
      </section>

      <div className={`grid items-start gap-5 ${hasDetails ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]' : ''}`}>
        <section aria-labelledby="functions-list-title" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 id="functions-list-title" className="m-0 text-lg font-extrabold">Funções cadastradas</h2><p className="mb-0 mt-1 text-sm text-app-muted">Selecione uma função para conhecer seus usuários ativos.</p></div><button type="button" className={SECONDARY} disabled={loading} onClick={() => void reload()}>{loading ? 'Atualizando…' : 'Atualizar'}</button></div>
          <div className="mb-4 flex flex-wrap gap-2"><label className="min-w-[180px] flex-1"><span className="sr-only">Buscar função</span><input type="search" className="min-h-11 w-full rounded-xl border border-app-border-strong bg-app-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-app-brand" placeholder="Buscar função…" value={search} onChange={event => setSearch(event.target.value)} /></label><select aria-label="Filtrar situação das funções" className="min-h-11 rounded-xl border border-app-border-strong bg-app-surface px-3 text-sm" value={status} onChange={event => setStatus(event.target.value)}><option value="all">Todas as situações</option><option value="1">Ativas</option><option value="2">Inativas</option></select></div>
          {loading && !data ? <p role="status" className="rounded-xl border border-dashed border-app-border p-8 text-center text-sm text-app-muted">Carregando funções e usuários…</p> : null}
          <div className={`grid gap-3 ${hasDetails ? 'sm:grid-cols-2 xl:grid-cols-1' : 'md:grid-cols-2 xl:grid-cols-3'}`}>{filtered.map(item => {
            const users = membersByFunction.get(item.id) ?? [], active = selection === item.id;
            return <button type="button" key={item.id} aria-pressed={active} onClick={() => setSelection(active ? null : item.id)} className={`${CARD} group min-w-0 p-5 text-left transition hover:border-app-brand hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-brand ${active ? 'border-app-brand bg-app-brand-soft ring-1 ring-app-brand' : ''}`}>
              <span className="flex items-start justify-between gap-3"><span className="flex min-w-0 items-center gap-3"><span className="rounded-xl bg-app-surface-muted p-2 text-app-brand"><NavigationIcon name="shield" className="size-5" /></span><strong className="break-words text-sm font-bold">{item.name}</strong></span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${item.status === 1 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-app-surface-muted text-app-muted'}`}>{item.status === 1 ? 'Ativa' : 'Inativa'}</span></span>
              <span className="mt-4 flex items-baseline gap-2"><strong className="text-3xl font-extrabold tracking-tight">{users.length}</strong><span className="text-xs text-app-muted">{users.length === 1 ? 'usuário ativo' : 'usuários ativos'}</span><span className="ml-auto text-xs text-app-muted">{item.isGlobalAdmin ? 'Acesso global' : `${item.permissionIds.length} permissões`}</span></span>
              <span className="mt-4 flex items-center gap-2 border-t border-app-border pt-3"><span className="flex -space-x-1.5" aria-hidden>{users.slice(0, 3).map(user => <span key={user.id} className="flex size-7 items-center justify-center rounded-full border-2 border-app-surface bg-app-brand-soft text-[9px] font-bold text-app-brand">{userInitials(user.name)}</span>)}</span><span className="min-w-0 flex-1 truncate text-xs text-app-muted">{users.length ? users.slice(0, 2).map(user => user.name).join(', ') + (users.length > 2 ? ` +${users.length - 2}` : '') : 'Nenhum usuário ativo vinculado'}</span><span className="text-app-brand" aria-hidden>→</span></span>
            </button>;
          })}</div>
          {data && !filtered.length ? <div className={`${CARD} grid justify-items-center gap-2 p-10 text-center text-app-muted`}><NavigationIcon name="shield" className="size-8" /><p className="m-0 text-sm">{functions.length ? 'Nenhuma função encontrada com estes filtros.' : 'Nenhuma função cadastrada. Use “Nova função” para começar.'}</p></div> : null}
          {data ? <p className="mb-0 mt-4 text-xs text-app-muted">{filtered.length} de {functions.length} funções · Somente usuários ativos entram nas contagens.</p> : null}
        </section>

        {hasDetails ? <section className={`${CARD} min-w-0 overflow-hidden`} aria-labelledby="function-details-title">
          <header className="border-b border-app-border bg-app-surface-muted/50 p-5"><div className="flex items-start justify-between gap-3"><div><p className="mb-1 mt-0 text-[11px] font-bold uppercase tracking-widest text-app-muted">{isUnassigned ? 'Revisão de cadastros' : 'Detalhes da função'}</p><h2 id="function-details-title" className="m-0 break-words text-xl font-extrabold">{isUnassigned ? 'Usuários sem função' : selected?.name}</h2></div><button type="button" className={SECONDARY} aria-label="Fechar detalhes da função" onClick={() => setSelection(null)}>Fechar</button></div>
            {selected ? <div className="mt-4 grid gap-3"><span className="text-xs text-app-muted">{selected.linkedUserCount} vínculos no total, incluindo usuários inativos</span><div className="flex flex-wrap gap-2"><button type="button" className={SECONDARY} disabled={loading || deleting || selected.isGlobalAdmin} onClick={() => { setEditor(selected.id); setSuccess(''); }}>Editar função</button><button type="button" className={SECONDARY} disabled={loading || deleting || selected.isGlobalAdmin || selected.activeUserCount > 0} title={selected.activeUserCount > 0 ? 'Esta função possui usuários ativos.' : 'Excluir a função e preservar os cadastros inativos.'} onClick={() => void remove(selected).catch(reason => setError(functionApiMessage(reason)))}>{deleting ? 'Excluindo…' : 'Excluir função'}</button></div>{selected.activeUserCount === 0 && !selected.isGlobalAdmin ? <span className="text-xs text-app-muted">Sem usuários ativos: a função pode ser excluída. Os cadastros inativos serão mantidos e ficarão sem função.</span> : null}</div> : null}
            {selected?.status === 2 ? <p className="mb-0 mt-3 text-xs text-app-muted">Esta função está inativa, mas mantém os usuários já vinculados.</p> : null}
            {selected?.isGlobalAdmin ? <p className="mb-0 mt-3 text-sm text-app-muted">Função protegida com acesso global ao sistema. Somente administradores globais podem atribuir esta função e alterar seus integrantes. Gerencie os vínculos na página de usuários.</p> : null}
          </header>
          <div className="p-5"><UserFunctionMembers key={String(selection)} users={selectedMembers} unassigned={isUnassigned} /></div>
          {selected && !selected.isGlobalAdmin ? <details className="border-t border-app-border"><summary className="cursor-pointer px-5 py-4 text-sm font-semibold">Permissões desta função <span className="text-xs text-app-muted">({selected.permissionIds.length})</span></summary><ul className="m-0 grid list-none gap-2 px-5 pb-5">{selectedPermissions.map(permission => <li key={permission.id} className="rounded-lg bg-app-surface-muted p-3 text-sm"><strong className="font-semibold">{permission.name}</strong><span className="mt-1 block text-xs text-app-muted">{permission.module}</span></li>)}{!selectedPermissions.length ? <li className="text-sm text-app-muted">Nenhuma permissão configurada.</li> : null}</ul></details> : null}
        </section> : null}
      </div>
    </div>
    {editor !== null && data ? <UserFunctionEditor key={editor} initial={editorInitial} permissions={data.permissions} onSave={save} onDelete={editorInitial ? () => remove(editorInitial) : undefined} onClose={() => setEditor(null)} /> : null}
  </main>;
}

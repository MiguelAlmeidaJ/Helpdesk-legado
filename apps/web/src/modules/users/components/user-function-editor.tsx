"use client";

import type { AccessPermissionItem, UserFunctionInput, UserFunctionSummary } from '@helpdesk/contracts';
import { useEffect, useRef, useState } from 'react';
import { appButtonClass } from '../../../shared/ui/button-styles';
import { functionApiMessage } from './user-function-utils';

interface Props {
  initial: UserFunctionSummary | null;
  permissions: AccessPermissionItem[];
  onSave: (input: UserFunctionInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export function UserFunctionEditor({ initial, permissions, onSave, onDelete, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<UserFunctionInput>(() => ({ name: initial?.name ?? '', status: initial?.status ?? 1, permissionIds: [...(initial?.permissionIds ?? [])] }));
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    nameInput.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  const groups = new Map<string, AccessPermissionItem[]>();
  for (const permission of permissions) {
    if (search && !`${permission.module} ${permission.name} ${permission.description ?? ''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))) continue;
    const entries = groups.get(permission.module) ?? [];
    entries.push(permission); groups.set(permission.module, entries);
  }
  const field = 'min-h-11 w-full rounded-xl border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none focus-visible:ring-2 focus-visible:ring-app-brand';
  return <dialog ref={dialog} aria-labelledby="function-editor-title" aria-describedby="function-editor-description" onClose={() => { if (!dialog.current?.open) onClose(); }} onCancel={event => { if (busy) event.preventDefault(); }} className="m-auto max-h-[90dvh] w-[min(850px,calc(100%_-_24px))] max-w-none overflow-hidden rounded-2xl border border-app-border bg-app-surface p-0 text-app-text shadow-2xl backdrop:bg-slate-950/50">
    <div className="flex max-h-[90dvh] flex-col">
      <header className="flex items-start justify-between gap-4 border-b border-app-border px-6 py-5"><div><p className="mb-1 mt-0 text-[11px] font-bold uppercase tracking-widest text-app-brand">Configuração de acesso</p><h2 id="function-editor-title" className="m-0 text-xl font-extrabold">{initial ? 'Editar função' : 'Nova função'}</h2><p id="function-editor-description" className="mb-0 mt-1 text-sm text-app-muted">Defina a identificação e as permissões herdadas pelos usuários.</p></div><button type="button" className={appButtonClass('secondary')} disabled={busy} onClick={() => dialog.current?.close()} aria-label="Fechar formulário de função">Fechar</button></header>
      <form id="user-function-editor-form" className="min-h-0 overflow-y-auto px-6 py-5" onSubmit={async event => {
        event.preventDefault(); setBusy(true); setError('');
        try { await onSave({ ...form, name: form.name.trim() }); } catch (reason) { setError(functionApiMessage(reason)); } finally { setBusy(false); }
      }}>
        {error ? <p role="alert" className="mt-0 rounded-xl border border-app-danger-border bg-app-danger-soft p-3 text-sm text-app-danger">{error}</p> : null}
        <fieldset disabled={busy} className="m-0 grid min-w-0 gap-5 border-0 p-0">
          <div className="grid gap-4 sm:grid-cols-[1fr_170px]"><label className="grid gap-1.5 text-xs font-bold text-app-muted">Nome da função<input ref={nameInput} className={field} maxLength={50} required value={form.name} placeholder="Ex.: Analista de suporte" onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label><label className="grid gap-1.5 text-xs font-bold text-app-muted">Situação<select className={field} value={form.status} onChange={event => setForm(current => ({ ...current, status: Number(event.target.value) as 1 | 2 }))}><option value={1}>Ativa</option><option value={2}>Inativa</option></select></label></div>
          <p className="m-0 rounded-xl bg-app-surface-muted p-3 text-xs leading-relaxed text-app-muted">Funções inativas mantêm os vínculos existentes e deixam de aparecer para novas atribuições.</p>
          <div className="flex items-center justify-between"><h3 className="m-0 font-bold">Permissões por módulo</h3><span className="text-xs font-semibold text-app-brand">{form.permissionIds.length} {form.permissionIds.length === 1 ? 'selecionada' : 'selecionadas'}</span></div>
          <label className="grid gap-1.5 text-xs font-bold text-app-muted">Buscar permissão<input type="search" className={field} value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome da permissão ou módulo…" /></label>
          <div className="grid gap-3">{[...groups].map(([module, entries]) => {
            const selectedCount = entries.filter(p => form.permissionIds.includes(p.id)).length;
            return <details key={module} open={search ? true : undefined} className="overflow-hidden rounded-xl border border-app-border">
              <summary className="cursor-pointer bg-app-surface-muted px-4 py-3 text-sm font-bold">{module}<span className="ml-2 text-xs font-normal text-app-muted">{selectedCount}/{entries.length}</span></summary>
              <div className="flex justify-end border-t border-app-border p-2"><button type="button" className={appButtonClass('secondary')} onClick={() => setForm(current => {
                const next = new Set(current.permissionIds), all = entries.every(permission => next.has(permission.id));
                entries.forEach(permission => all ? next.delete(permission.id) : next.add(permission.id)); return { ...current, permissionIds: [...next] };
              })}>{selectedCount === entries.length ? (search ? 'Desmarcar resultados' : 'Desmarcar módulo') : (search ? 'Selecionar resultados' : 'Selecionar módulo')}</button></div>
              <div className="grid divide-y divide-app-border sm:grid-cols-2">{entries.map(permission => <label key={permission.id} className="flex cursor-pointer items-start gap-3 border-t border-app-border p-4 hover:bg-app-surface-hover"><input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-app-brand" checked={form.permissionIds.includes(permission.id)} onChange={() => setForm(current => ({ ...current, permissionIds: current.permissionIds.includes(permission.id) ? current.permissionIds.filter(id => id !== permission.id) : [...current.permissionIds, permission.id] }))} /><span className="grid gap-1"><strong className="text-sm font-semibold">{permission.name}</strong><small className="text-xs leading-relaxed text-app-muted">{permission.description ?? permission.slug}</small></span></label>)}</div>
            </details>;
          })}</div>
          {!groups.size ? <p className="text-sm text-app-muted">Nenhuma permissão encontrada.</p> : null}
        </fieldset>
      </form>
      <footer className="flex flex-wrap justify-end gap-2 border-t border-app-border bg-app-surface px-6 py-4">
        {initial && onDelete ? <button type="button" className={`${appButtonClass('secondary')} mr-auto`} disabled={busy || initial.linkedUserCount > 0} title={initial.linkedUserCount > 0 ? 'Esta função possui usuários vinculados, incluindo inativos.' : undefined} onClick={async () => { setBusy(true); setError(''); try { await onDelete(); } catch (reason) { setError(functionApiMessage(reason)); } finally { setBusy(false); } }}>Excluir função</button> : null}
        <button type="button" className={appButtonClass('secondary')} disabled={busy} onClick={() => dialog.current?.close()}>Cancelar</button>
        <button type="submit" form="user-function-editor-form" className={appButtonClass('primary')} disabled={busy || !form.name.trim()}>{busy ? 'Salvando…' : initial ? 'Salvar alterações' : 'Criar função'}</button>
      </footer>
    </div>
  </dialog>;
}

"use client";

import type {
  AccessManagementSnapshot,
  AccessPermissionItem,
  AccessRole,
  CurrentUserResponse,
} from '@helpdesk/contracts';
import type { DragEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import {
  createAccessRole,
  deleteAccessRole,
  fetchAccessManagement,
  reorderAccessRoles,
  updateAccessRole,
} from '../api/access-management-api';

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] border border-app-border-strong bg-app-surface px-4 font-bold text-app-text-soft transition hover:bg-app-surface-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_BUTTON_CLASS =
  `${BUTTON_CLASS} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;

const styles = {
  page: 'min-h-screen bg-app-bg text-app-text',
  content: 'mx-auto w-full max-w-[1500px] p-6 max-sm:px-3.5',
  layout: 'grid items-start gap-4 min-[980px]:grid-cols-[minmax(320px,0.78fr)_minmax(620px,1.65fr)]',
  card: 'rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10',
  list: 'grid gap-2',
  roleItem: 'flex items-stretch gap-1 rounded-lg border border-app-border bg-app-surface transition data-[dragging=true]:opacity-50 data-[over=true]:border-app-brand data-[active=true]:border-app-brand data-[active=true]:bg-app-brand-soft',
  dragHandle: 'flex w-8 cursor-grab select-none items-center justify-center text-lg font-black text-app-muted active:cursor-grabbing',
  role: 'min-w-0 flex-1 cursor-pointer rounded-md border-0 bg-transparent px-2 py-3 text-left hover:bg-app-surface-hover',
  roleTop: 'flex items-start justify-between gap-3',
  roleMeta: 'mt-1 text-xs text-app-muted',
  roleControls: 'grid w-9 shrink-0 content-center gap-1 pr-1',
  orderButton: 'flex h-7 w-7 items-center justify-center rounded-md border border-app-border bg-app-surface text-sm font-bold text-app-muted hover:border-app-brand hover:text-app-text disabled:cursor-not-allowed disabled:opacity-30',
  badge: 'rounded-full bg-app-surface-muted px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-app-muted',
  editorTitle: 'mb-4 flex flex-wrap items-start justify-between gap-3',
  formGrid: 'grid grid-cols-2 gap-3 max-sm:grid-cols-1 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-xs [&_label]:font-extrabold [&_label]:text-app-muted [&_input]:min-h-10 [&_input]:rounded-lg [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-3 [&_input]:text-app-text [&_textarea]:min-h-24 [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-app-border-strong [&_textarea]:bg-app-surface [&_textarea]:p-3 [&_textarea]:text-app-text',
  wide: 'col-span-2 max-sm:col-span-1',
  module: 'mt-4 overflow-hidden rounded-lg border border-app-border',
  moduleHeader: 'flex flex-wrap items-center justify-between gap-3 border-b border-app-border bg-app-surface-muted px-3 py-2.5',
  permissionGrid: 'grid gap-px bg-app-border md:grid-cols-2',
  permission: 'flex cursor-pointer items-start gap-2.5 bg-app-surface px-3 py-3 text-sm hover:bg-app-surface-hover [&_input]:mt-0.5 [&_input]:h-4 [&_input]:w-4 [&_span]:grid [&_small]:mt-0.5 [&_small]:text-xs [&_small]:text-app-muted',
  actions: 'mt-4 flex flex-wrap justify-end gap-2',
  error: 'mb-3 rounded-lg border border-app-danger-border bg-app-danger-soft px-3 py-[11px] text-[13px] text-app-danger',
  success: 'mb-3 rounded-lg border border-emerald-300/70 bg-emerald-50 px-3 py-[11px] text-[13px] text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200',
  hint: 'text-sm text-app-muted',
} as const;

type FormState = { name: string; description: string; permissionIds: number[] };
const EMPTY_FORM: FormState = { name: '', description: '', permissionIds: [] };

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.body && typeof error.body === 'object') {
      const value = (error.body as Record<string, unknown>).message;
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    }
    if (error.status === 403) return 'Seu usuário não possui permissão para gerenciar acessos.';
    return `A API respondeu com erro ${error.status}.`;
  }
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
}
function toForm(role: AccessRole): FormState {
  return { name: role.name, description: role.description ?? '', permissionIds: [...role.permissionIds] };
}
function permissionModuleLabel(module: string): string {
  const normalized = module.trim().toLocaleLowerCase('pt-BR');
  if (normalized === 'projetos' || normalized === 'projeto') {
    return 'Projetos e Tarefas (DevOps)';
  }
  return module;
}

function permissionModuleHint(module: string): string | null {
  const normalized = module.trim().toLocaleLowerCase('pt-BR');
  if (normalized === 'projetos' || normalized === 'projeto') {
    return 'As mesmas permissões controlam projetos e tarefas do DevOps.';
  }
  return null;
}

function permissionGroups(permissions: AccessPermissionItem[]) {
  const groups = new Map<string, AccessPermissionItem[]>();
  for (const permission of permissions) {
    const entries = groups.get(permission.module) ?? [];
    entries.push(permission);
    groups.set(permission.module, entries);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
}
function duplicateRoleName(role: AccessRole, roles: AccessRole[]): string {
  const existing = new Set(
    roles.map((entry) => entry.name.trim().toLocaleLowerCase('pt-BR')),
  );
  const base = `${role.name} - Cópia`;
  if (!existing.has(base.toLocaleLowerCase('pt-BR'))) return base;

  let index = 2;
  while (existing.has(`${base} ${index}`.toLocaleLowerCase('pt-BR'))) {
    index += 1;
  }
  return `${base} ${index}`;
}

function moveRole(roles: AccessRole[], sourceId: number, targetIndex: number): AccessRole[] {
  const sourceIndex = roles.findIndex((role) => role.id === sourceId);
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= roles.length) return roles;
  const next = [...roles];
  const [moved] = next.splice(sourceIndex, 1);
  if (!moved) return roles;
  next.splice(targetIndex, 0, moved);
  return next.map((role, index) => ({ ...role, sortOrder: index * 10 }));
}

export function AccessManagementScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const [snapshot, setSnapshot] = useState<AccessManagementSnapshot | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedRole = snapshot?.roles.find((role) => role.id === selectedId) ?? null;
  const groups = useMemo(() => permissionGroups(snapshot?.permissions ?? []), [snapshot?.permissions]);
  const systemAdmin = selectedRole?.slug === 'system-admin';

  async function load(preferredId?: number, signal?: AbortSignal) {
    setLoading(true); setError(null);
    try {
      const next = await fetchAccessManagement(signal);
      setSnapshot(next);
      const id = preferredId ?? selectedId;
      if (id) {
        const role = next.roles.find((entry) => entry.id === id);
        if (role) { setSelectedId(role.id); setForm(toForm(role)); }
        else { setSelectedId(null); setForm({ ...EMPTY_FORM, permissionIds: [] }); }
      }
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setError(errorMessage(reason));
    } finally { if (!signal?.aborted) setLoading(false); }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(undefined, controller.signal);
    return () => controller.abort();
  }, []);

  function selectRole(role: AccessRole) { setSelectedId(role.id); setForm(toForm(role)); setError(null); setSuccess(null); }
  function newRole() { setSelectedId(null); setForm({ ...EMPTY_FORM, permissionIds: [] }); setError(null); setSuccess(null); }
  function togglePermission(id: number) {
    setForm((current) => ({ ...current, permissionIds: current.permissionIds.includes(id) ? current.permissionIds.filter((permissionId) => permissionId !== id) : [...current.permissionIds, id] }));
  }
  function toggleModule(permissions: AccessPermissionItem[]) {
    const ids = permissions.map((permission) => permission.id);
    const allSelected = ids.every((id) => form.permissionIds.includes(id));
    setForm((current) => {
      const next = new Set(current.permissionIds);
      for (const id of ids) { if (allSelected) next.delete(id); else next.add(id); }
      return { ...current, permissionIds: [...next] };
    });
  }
  async function persistOrder(nextRoles: AccessRole[]) {
    if (!snapshot) return;
    const previous = snapshot.roles;
    setSnapshot({ ...snapshot, roles: nextRoles }); setReordering(true); setError(null); setSuccess(null);
    try { await reorderAccessRoles(nextRoles.map((role) => role.id)); setSuccess('Ordem dos tipos de usuário salva.'); }
    catch (reason) { setSnapshot((current) => current ? { ...current, roles: previous } : current); setError(errorMessage(reason)); }
    finally { setReordering(false); }
  }
  function moveByButton(roleId: number, direction: -1 | 1) {
    if (!snapshot || reordering) return;
    const index = snapshot.roles.findIndex((role) => role.id === roleId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= snapshot.roles.length) return;
    void persistOrder(moveRole(snapshot.roles, roleId, target));
  }
  function dragStart(event: DragEvent<HTMLDivElement>, roleId: number) {
    if (reordering) { event.preventDefault(); return; }
    event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(roleId)); setDraggedId(roleId);
  }
  function drop(event: DragEvent<HTMLDivElement>, targetId: number) {
    event.preventDefault();
    if (!snapshot || reordering) return;
    const sourceId = draggedId ?? Number(event.dataTransfer.getData('text/plain'));
    const targetIndex = snapshot.roles.findIndex((role) => role.id === targetId);
    setDraggedId(null); setDragOverId(null);
    if (!Number.isSafeInteger(sourceId) || sourceId === targetId || targetIndex < 0) return;
    void persistOrder(moveRole(snapshot.roles, sourceId, targetIndex));
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (systemAdmin) return;
    const editing = Boolean(selectedId); setSaving(true); setError(null); setSuccess(null);
    try {
      const input = { name: form.name.trim(), description: form.description.trim() || null, permissionIds: form.permissionIds };
      const response = selectedId ? await updateAccessRole(selectedId, input) : await createAccessRole(input);
      await load(response.id); setSuccess(editing ? 'Tipo de usuário atualizado.' : 'Tipo de usuário criado.');
    } catch (reason) { setError(errorMessage(reason)); } finally { setSaving(false); }
  }
  async function duplicate() {
    if (!selectedRole || systemAdmin || !snapshot) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await createAccessRole({
        name: duplicateRoleName(selectedRole, snapshot.roles),
        description: selectedRole.description,
        permissionIds: [...selectedRole.permissionIds],
      });
      await load(response.id);
      setSuccess('Tipo de usuário duplicado. A cópia já está selecionada para edição.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selectedRole || systemAdmin) return;
    const linkedWarning = selectedRole.userCount > 0 ? ` ${selectedRole.userCount} ${selectedRole.userCount === 1 ? 'usuário perderá' : 'usuários perderão'} este tipo de usuário e as permissões herdadas dele.` : '';
    if (!window.confirm(`Excluir o tipo de usuário "${selectedRole.name}"?${linkedWarning}`)) return;
    setSaving(true); setError(null); setSuccess(null);
    try { await deleteAccessRole(selectedRole.id); setSelectedId(null); setForm({ ...EMPTY_FORM, permissionIds: [] }); await load(); setSuccess('Tipo de usuário excluído.'); }
    catch (reason) { setError(errorMessage(reason)); } finally { setSaving(false); }
  }

  return <main className={styles.page}>
    <AppPageHeader actions={<button className={PRIMARY_BUTTON_CLASS} onClick={newRole} type="button">Novo tipo de usuário</button>} subtitle="Crie perfis reutilizáveis, ordene-os e defina quais permissões cada perfil concede." title="Permissões" user={currentUser} />
    <div className={styles.content}>
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {success ? <div className={styles.success} role="status">{success}</div> : null}
      <div className={styles.layout}>
        <section className={styles.card}>
          <h2 className="mb-1 text-lg font-extrabold">Tipos de usuário</h2>
          <p className="mb-4 text-sm text-app-muted">Arraste para ordenar. Os botões ↑ e ↓ fazem a mesma operação pelo teclado.</p>
          {loading && !snapshot ? <p className={styles.hint}>Carregando…</p> : null}
          <div className={styles.list}>
            {snapshot?.roles.map((role, index) => <div className={styles.roleItem} data-active={selectedId === role.id} data-dragging={draggedId === role.id} data-over={dragOverId === role.id && draggedId !== role.id} draggable={!reordering} key={role.id} onDragEnd={() => { setDraggedId(null); setDragOverId(null); }} onDragOver={(event) => { event.preventDefault(); setDragOverId(role.id); }} onDragStart={(event) => dragStart(event, role.id)} onDrop={(event) => drop(event, role.id)}>
              <span aria-hidden="true" className={styles.dragHandle}>⋮⋮</span>
              <button className={styles.role} onClick={() => selectRole(role)} type="button"><span className={styles.roleTop}><strong>{role.name}</strong>{role.system ? <span className={styles.badge}>Sistema</span> : null}</span><span className={styles.roleMeta}>{role.userCount} {role.userCount === 1 ? 'usuário' : 'usuários'} · {role.permissionIds.length} permissões</span></button>
              <span className={styles.roleControls}>
                <button aria-label={`Mover ${role.name} para cima`} className={styles.orderButton} disabled={reordering || index === 0} onClick={() => moveByButton(role.id, -1)} type="button">↑</button>
                <button aria-label={`Mover ${role.name} para baixo`} className={styles.orderButton} disabled={reordering || index === (snapshot?.roles.length ?? 0) - 1} onClick={() => moveByButton(role.id, 1)} type="button">↓</button>
              </span>
            </div>)}
          </div>
        </section>
        <section className={styles.card}>
          <div className={styles.editorTitle}><div><h2 className="text-xl font-extrabold">{selectedRole ? selectedRole.name : 'Novo tipo de usuário'}</h2><p className={styles.hint}>{systemAdmin ? 'O Administrador global possui acesso total implícito e é protegido contra alterações e exclusão.' : 'As alterações afetam todos os usuários vinculados a este perfil.'}</p></div>{selectedRole ? <span className={styles.badge}>{selectedRole.slug}</span> : null}</div>
          <form onSubmit={save}>
            <div className={styles.formGrid}>
              <label><span>Nome</span><input disabled={saving || Boolean(selectedRole?.system)} maxLength={100} onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} /></label>
              <label className={styles.wide}><span>Descrição</span><textarea disabled={saving || Boolean(selectedRole?.system)} maxLength={255} onChange={(event) => setForm({ ...form, description: event.target.value })} value={form.description} /></label>
            </div>
            {groups.map(([module, permissions]) => {
              const selectedCount = permissions.filter((permission) => form.permissionIds.includes(permission.id)).length;
              const moduleHint = permissionModuleHint(module);
              return <section className={styles.module} key={module}><div className={styles.moduleHeader}><div><div><strong>{permissionModuleLabel(module)}</strong><span className="ml-2 text-xs text-app-muted">{selectedCount}/{permissions.length}</span></div>{moduleHint ? <small className="mt-0.5 block text-xs text-app-muted">{moduleHint}</small> : null}</div><button className={BUTTON_CLASS} disabled={saving || systemAdmin} onClick={() => toggleModule(permissions)} type="button">{selectedCount === permissions.length ? 'Desmarcar módulo' : 'Selecionar módulo'}</button></div><div className={styles.permissionGrid}>{permissions.map((permission) => <label className={styles.permission} key={permission.id}><input checked={form.permissionIds.includes(permission.id)} disabled={saving || systemAdmin} onChange={() => togglePermission(permission.id)} type="checkbox" /><span><strong>{permission.name}</strong><small>{permission.description || permission.slug}</small></span></label>)}</div></section>;
            })}
            <div className={styles.actions}>
              {selectedRole ? <button className={BUTTON_CLASS} disabled={saving || systemAdmin} onClick={() => void duplicate()} title={systemAdmin ? 'O Administrador global possui acesso total implícito e não pode ser duplicado.' : 'Criar uma cópia deste tipo com as mesmas permissões.'} type="button">Duplicar tipo</button> : null}
              {selectedRole && !systemAdmin ? <button className={BUTTON_CLASS} disabled={saving} onClick={() => void remove()} type="button">Excluir tipo de usuário</button> : null}
              {!systemAdmin ? <button className={PRIMARY_BUTTON_CLASS} disabled={saving || !form.name.trim()} type="submit">{saving ? 'Salvando…' : selectedId ? 'Salvar alterações' : 'Criar tipo de usuário'}</button> : null}
            </div>
          </form>
        </section>
      </div>
    </div>
  </main>;
}

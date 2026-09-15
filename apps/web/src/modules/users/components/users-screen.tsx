"use client";

import { AppPermission, type CurrentUserResponse, type ManagedUserDetail, type ManagedUserListResponse, type UserManagementCatalogs } from '@helpdesk/contracts';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { createUser, deactivateUser, fetchUser, fetchUserCatalogs, fetchUsers, updateUser } from '../api/users-api';
import styles from './users-screen.module.css';

const EMPTY_MODULES = Array(9).fill('0000000000') as string[];
const MODULE_LABELS = ['Usuários', 'Cadastros', 'Atendimentos', 'Configurações', 'Relatórios/Projetos', 'Inventário/Facility', 'Financeiro', 'Disponibilidade/Marketing', 'Veículos'];

interface FormState {
  status: 1 | 2;
  name: string;
  email: string;
  phone: string;
  functionId: string;
  login: string;
  password: string;
  type: 1 | 2;
  link: string;
  pixKeyType: string;
  pixKey: string;
  companyIds: number[];
  legacyModules: string[];
}

const EMPTY_FORM: FormState = { status: 1, name: '', email: '', phone: '', functionId: '', login: '', password: '', type: 1, link: '', pixKeyType: '', pixKey: '', companyIds: [], legacyModules: EMPTY_MODULES };

function fromUser(user: ManagedUserDetail): FormState {
  return { status: user.status, name: user.name, email: user.email, phone: user.phone, functionId: user.function?.id.toString() ?? '', login: user.login, password: '', type: user.type === 2 ? 2 : 1, link: user.link, pixKeyType: user.pixKeyType?.toString() ?? '', pixKey: user.pixKey, companyIds: user.companies.map((company) => company.id), legacyModules: [...user.legacyModules] };
}

function message(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.body && typeof error.body === 'object') {
      const value = (error.body as Record<string, unknown>).message;
      if (typeof value === 'string') return value;
    }
    if (error.status === 403) return 'Seu usuário não possui permissão para esta operação.';
    return `A API respondeu com erro ${error.status}.`;
  }
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
}

function can(user: CurrentUserResponse, permission: AppPermission): boolean {
  return user.grants.some((grant) => grant.permission === AppPermission.SystemAdmin || grant.permission === permission);
}

export function UsersScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [result, setResult] = useState<ManagedUserListResponse | null>(null);
  const [catalogs, setCatalogs] = useState<UserManagementCatalogs | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canCreate = can(currentUser, AppPermission.UsersCreate);
  const canEdit = can(currentUser, AppPermission.UsersEdit);
  const canManageAccess = can(currentUser, AppPermission.UsersManageAccess);

  async function load(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try {
      const [users, options] = await Promise.all([fetchUsers(page, appliedSearch, signal), catalogs ? Promise.resolve(catalogs) : fetchUserCatalogs()]);
      setResult(users);
      setCatalogs(options);
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setError(message(reason));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [page, appliedSearch]);

  const title = selectedId ? `Editar usuário #${selectedId}` : 'Novo usuário';
  const validModules = useMemo(() => form.legacyModules.every((value) => /^\d{10}$/.test(value)), [form.legacyModules]);

  async function selectUser(id: number) {
    setError(null); setSuccess(null); setLoading(true);
    try { const user = await fetchUser(id); setSelectedId(id); setForm(fromUser(user)); }
    catch (reason) { setError(message(reason)); }
    finally { setLoading(false); }
  }

  function newUser() { setSelectedId(null); setForm({ ...EMPTY_FORM, legacyModules: [...EMPTY_MODULES] }); setError(null); setSuccess(null); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null); setSuccess(null);
    const base = { status: form.status, name: form.name, email: form.email, phone: form.phone, functionId: Number(form.functionId), login: form.login, type: form.type, link: form.link, pixKeyType: form.pixKeyType ? Number(form.pixKeyType) : null, pixKey: form.pixKey, companyIds: form.companyIds, ...(canManageAccess ? { legacyModules: form.legacyModules } : {}) };
    try {
      const saved = selectedId
        ? await updateUser(selectedId, base)
        : await createUser({ ...base, password: form.password });
      setSelectedId(saved.id); setForm(fromUser(saved)); setSuccess('Usuário salvo com sucesso.'); await load();
    } catch (reason) { setError(message(reason)); }
    finally { setSaving(false); }
  }

  async function deactivate() {
    if (!selectedId || !window.confirm('Deseja desativar este usuário e encerrar suas sessões?')) return;
    setSaving(true); setError(null);
    try { await deactivateUser(selectedId); setSuccess('Usuário desativado.'); setForm((current) => ({ ...current, status: 2 })); await load(); }
    catch (reason) { setError(message(reason)); }
    finally { setSaving(false); }
  }

  return (
    <main className="tickets-page">
      <header className="tickets-header"><div className="tickets-header-left"><AppSidebar /><Link className="tickets-brand" href="/dashboard"><strong>Helpdesk</strong><span>Nova plataforma</span></Link></div><SessionUserMenu user={currentUser} /></header>
      <div className="tickets-content">
        <div className="tickets-title-row"><div><span className="eyebrow">Administração</span><h1>Usuários</h1><p>Cadastro, vínculos, situação e acessos em uma única tela.</p></div>{canCreate ? <button className="button button-primary" onClick={newUser} type="button">Novo usuário</button> : null}</div>
        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        {success ? <div className={styles.success} role="status">{success}</div> : null}
        <div className={styles.layout}>
          <section className={styles.listCard}>
            <form className={styles.search} onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedSearch(search.trim()); }}><input onChange={(event) => setSearch(event.target.value)} placeholder="Nome, login ou e-mail" type="search" value={search} /><button className="button" type="submit">Buscar</button></form>
            {loading && !result ? <p>Carregando…</p> : null}
            <div className={styles.userList}>{result?.data.map((user) => <button data-active={selectedId === user.id} key={user.id} onClick={() => void selectUser(user.id)} type="button"><span><strong>{user.name || `Usuário #${user.id}`}</strong><small>@{user.login} · {user.email}</small></span><em data-status={user.status}>{user.status === 1 ? 'Ativo' : 'Inativo'}</em></button>)}</div>
            <div className={styles.pagination}><button className="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} type="button">Anterior</button><span>Página {result?.meta.page ?? page}{result?.meta.totalPages ? ` de ${result.meta.totalPages}` : ''}</span><button className="button" disabled={loading || !result || page >= result.meta.totalPages} onClick={() => setPage((value) => value + 1)} type="button">Próxima</button></div>
          </section>

          <section className={styles.editor}>
            <h2>{title}</h2>
            {!selectedId && !canCreate ? <p>Selecione um usuário para consultar.</p> : (
              <form onSubmit={save}>
                <div className={styles.grid}>
                  <label><span>Nome</span><input disabled={saving || (!!selectedId && !canEdit)} maxLength={60} onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} /></label>
                  <label><span>E-mail</span><input disabled={saving || (!!selectedId && !canEdit)} maxLength={60} onChange={(event) => setForm({ ...form, email: event.target.value })} required type="email" value={form.email} /></label>
                  <label><span>Celular</span><input disabled={saving || (!!selectedId && !canEdit)} maxLength={20} onChange={(event) => setForm({ ...form, phone: event.target.value })} required value={form.phone} /></label>
                  <label><span>Login</span><input disabled={saving || (!!selectedId && !canEdit)} maxLength={15} onChange={(event) => setForm({ ...form, login: event.target.value })} required value={form.login} /></label>
                  {!selectedId ? <label><span>Senha inicial</span><input disabled={saving} maxLength={100} minLength={12} onChange={(event) => setForm({ ...form, password: event.target.value })} required type="password" value={form.password} /></label> : null}
                  <label><span>Função</span><select disabled={saving || (!!selectedId && !canEdit)} onChange={(event) => setForm({ ...form, functionId: event.target.value })} required value={form.functionId}><option value="">Selecione</option>{catalogs?.functions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
                  <label><span>Tipo</span><select disabled={saving || (!!selectedId && !canEdit)} onChange={(event) => setForm({ ...form, type: Number(event.target.value) as 1 | 2 })} value={form.type}><option value={1}>Interno</option><option value={2}>Cliente</option></select></label>
                  <label><span>Situação</span><select disabled={saving || !selectedId || !canEdit} onChange={(event) => setForm({ ...form, status: Number(event.target.value) as 1 | 2 })} value={form.status}><option value={1}>Ativo</option><option value={2}>Inativo</option></select></label>
                  <label><span>Link</span><input disabled={saving || (!!selectedId && !canEdit)} maxLength={50} onChange={(event) => setForm({ ...form, link: event.target.value })} value={form.link} /></label>
                  <label><span>Tipo de chave Pix</span><select disabled={saving || (!!selectedId && !canEdit)} onChange={(event) => setForm({ ...form, pixKeyType: event.target.value })} value={form.pixKeyType}><option value="">Nenhum</option>{catalogs?.pixKeyTypes.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
                  <label><span>Chave Pix</span><input disabled={saving || (!!selectedId && !canEdit)} maxLength={255} onChange={(event) => setForm({ ...form, pixKey: event.target.value })} value={form.pixKey} /></label>
                  <label className={styles.wide}><span>Empresas vinculadas</span><select disabled={saving || (!!selectedId && !canEdit)} multiple onChange={(event) => setForm({ ...form, companyIds: Array.from(event.target.selectedOptions, (option) => Number(option.value)) })} value={form.companyIds.map(String)}>{catalogs?.companies.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
                </div>
                {canManageAccess ? <fieldset className={styles.permissions}><legend>Acessos legados de transição</legend><p>Cada código contém os dez níveis do módulo e permanece compatível com as telas ainda não migradas.</p><div className={styles.moduleGrid}>{form.legacyModules.map((value, index) => <label key={MODULE_LABELS[index]}><span>{index + 1}. {MODULE_LABELS[index]}</span><input inputMode="numeric" maxLength={10} onChange={(event) => { const next = [...form.legacyModules]; next[index] = event.target.value; setForm({ ...form, legacyModules: next }); }} pattern="\d{10}" required value={value} /></label>)}</div></fieldset> : null}
                {(selectedId ? canEdit : canCreate) ? <div className={styles.actions}>{selectedId && form.status === 1 ? <button className="button" disabled={saving || selectedId === currentUser.id || selectedId === 1} onClick={() => void deactivate()} type="button">Desativar</button> : null}<button className="button button-primary" disabled={saving || !validModules} type="submit">{saving ? 'Salvando…' : 'Salvar usuário'}</button></div> : null}
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

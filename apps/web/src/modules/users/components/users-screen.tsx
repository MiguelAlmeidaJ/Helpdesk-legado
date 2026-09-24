"use client";

import { AppPermission, type CurrentUserResponse, type ManagedUserDetail, type ManagedUserListResponse, type UserManagementCatalogs } from '@helpdesk/contracts';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { createUser, deactivateUser, fetchUser, fetchUserCatalogs, fetchUsers, updateUser } from '../api/users-api';
const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] border border-app-border-strong bg-app-surface px-4 font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-50';

const PRIMARY_BUTTON_CLASS =
  `${BUTTON_CLASS} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;

const FORM_CONTROL_CLASS =
  '[&_input]:min-h-10 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-2.5 [&_input]:text-app-text [&_input]:outline-none [&_input]:transition [&_select]:min-h-10 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-2.5 [&_select]:text-app-text [&_select]:outline-none [&_select]:transition [&_input:focus]:border-app-brand [&_input:focus]:ring-3 [&_input:focus]:ring-[var(--app-brand-ring)] [&_select:focus]:border-app-brand [&_select:focus]:ring-3 [&_select:focus]:ring-[var(--app-brand-ring)] [&_input:disabled]:cursor-not-allowed [&_input:disabled]:opacity-55 [&_select:disabled]:cursor-not-allowed [&_select:disabled]:opacity-55';

const FIELD_GRID_CLASS =
  `grid grid-cols-2 gap-3 max-[620px]:grid-cols-1 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-xs [&_label]:font-extrabold [&_label]:text-app-muted ${FORM_CONTROL_CLASS}`;

const styles = {
  page: 'min-h-screen bg-app-bg text-app-text',
  header:
    'sticky top-0 z-20 flex items-center justify-between gap-5 border-b border-app-border bg-[var(--app-header-bg)] px-6 py-3.5 backdrop-blur-xl max-sm:px-3.5',
  headerLeft: 'flex min-w-0 items-center gap-2.5',
  brand:
    'flex items-baseline gap-2.5 no-underline [&_strong]:text-lg [&_span]:text-[13px] [&_span]:text-app-subtle max-sm:[&_span]:hidden',
  content: 'mx-auto w-full max-w-[1500px] p-6 max-sm:px-3.5',
  titleRow:
    'mb-[18px] flex items-end justify-between gap-6 max-md:flex-col max-md:items-stretch [&_h1]:m-0 [&_h1]:text-[28px] [&_p]:mt-1.5 [&_p]:mb-0 [&_p]:text-app-muted-strong',
  eyebrow:
    'mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted',
  button: BUTTON_CLASS,
  buttonPrimary: PRIMARY_BUTTON_CLASS,
  layout:
    'grid items-start gap-4 min-[951px]:grid-cols-[minmax(320px,0.8fr)_minmax(520px,1.5fr)]',
  listCard:
    'rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10',
  search:
    `mb-3 flex gap-2 ${FORM_CONTROL_CLASS} [&_input]:min-w-0 [&_input]:flex-1`,
  userList:
    'grid max-h-[620px] gap-1.5 overflow-auto [&_button]:flex [&_button]:w-full [&_button]:cursor-pointer [&_button]:items-center [&_button]:justify-between [&_button]:gap-2.5 [&_button]:rounded-[9px] [&_button]:border [&_button]:border-app-border [&_button]:bg-app-surface [&_button]:p-2.5 [&_button]:text-left [&_button]:transition [&_button:hover]:border-app-brand [&_button:hover]:bg-app-surface-hover [&_button[data-active=true]]:border-app-brand [&_button[data-active=true]]:bg-app-brand-soft [&_button_span]:grid [&_button_span]:min-w-0 [&_button_span]:gap-[3px] [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_small]:text-app-muted-strong [&_em]:rounded-full [&_em]:bg-app-surface-muted [&_em]:px-[7px] [&_em]:py-[3px] [&_em]:text-[10px] [&_em]:font-extrabold [&_em]:not-italic [&_em]:text-app-muted [&_em[data-active=true]]:bg-app-success-soft [&_em[data-active=true]]:text-app-success',
  pagination:
    'mt-3.5 flex items-center justify-between gap-2 text-xs text-app-muted-strong max-sm:flex-wrap',
  editor:
    'rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10 [&>h2]:mt-0 [&>h2]:mb-4 [&>h2]:text-xl [&>p]:text-app-muted',
  grid: `${FIELD_GRID_CLASS} [&_select[multiple]]:min-h-[120px] [&_select[multiple]]:p-1.5`,
  wide: 'col-span-2 max-[620px]:col-span-1',
  permissions:
    'mt-[18px] rounded-[10px] border border-app-border p-3.5 [&_legend]:px-1.5 [&_legend]:font-extrabold [&>p]:mt-0 [&>p]:mb-3 [&>p]:text-xs [&>p]:text-app-muted-strong',
  companyPicker:
    'col-span-2 grid gap-2 rounded-[10px] border border-app-border p-3.5 max-[620px]:col-span-1',
  companyPickerHeader:
    'flex flex-wrap items-center justify-between gap-2 [&_span]:text-xs [&_span]:font-extrabold [&_span]:text-app-muted [&_strong]:text-xs [&_strong]:text-app-text-soft',
  companyPickerBox:
    'overflow-hidden rounded-lg border border-app-border-strong bg-app-surface focus-within:border-app-brand focus-within:ring-3 focus-within:ring-[var(--app-brand-ring)]',
  companySearch:
    'min-h-10 w-full border-0 border-b border-app-border-soft bg-app-surface px-3 text-app-text outline-none',
  companyPickerActions:
    'flex items-center justify-between gap-2 border-b border-app-border-soft bg-app-surface-muted px-2.5 py-2 [&_button]:rounded-md [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-2 [&_button]:py-1 [&_button]:text-xs [&_button]:font-bold [&_button]:text-app-brand [&_button:hover]:bg-app-brand-soft [&_button:disabled]:opacity-40',
  companyList:
    'grid max-h-[210px] overflow-y-auto p-1.5 sm:grid-cols-2',
  companyOption:
    'flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-app-text hover:bg-app-surface-hover [&_input]:h-4 [&_input]:w-4 [&_input]:shrink-0',
  companyEmpty:
    'col-span-full px-3 py-5 text-center text-sm text-app-muted',
  roleGrid:
    'grid gap-2 sm:grid-cols-2 xl:grid-cols-3',
  roleOption:
    'flex cursor-pointer items-start gap-2.5 rounded-lg border border-app-border bg-app-surface-muted px-3 py-2.5 text-sm text-app-text transition hover:border-app-brand hover:bg-app-brand-soft [&_input]:mt-0.5 [&_input]:h-4 [&_input]:w-4 [&_span]:grid [&_small]:text-xs [&_small]:text-app-muted',
  actions: 'mt-4 flex justify-end gap-2 max-sm:flex-col max-sm:[&>*]:w-full',
  error:
    'mb-3 rounded-lg border border-app-danger-border bg-app-danger-soft px-3 py-[11px] text-[13px] text-app-danger',
  success:
    'mb-3 rounded-lg border border-emerald-300/70 bg-emerald-50 px-3 py-[11px] text-[13px] text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200',
} as const;

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
  roleIds: number[];
}

const EMPTY_FORM: FormState = { status: 1, name: '', email: '', phone: '', functionId: '', login: '', password: '', type: 1, link: '', pixKeyType: '', pixKey: '', companyIds: [], roleIds: [] };

function fromUser(user: ManagedUserDetail): FormState {
  return { status: user.status, name: user.name, email: user.email, phone: user.phone, functionId: user.function?.id.toString() ?? '', login: user.login, password: '', type: user.type === 2 ? 2 : 1, link: user.link, pixKeyType: user.pixKeyType?.toString() ?? '', pixKey: user.pixKey, companyIds: user.companies.map((company) => company.id), roleIds: user.roles.map((role) => role.id) };
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
  const [companyQuery, setCompanyQuery] = useState('');
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
  const visibleCompanies = useMemo(() => {
    const query = companyQuery.trim().toLocaleLowerCase('pt-BR');
    const companies = catalogs?.companies ?? [];
    return query
      ? companies.filter((company) => company.name.toLocaleLowerCase('pt-BR').includes(query))
      : companies;
  }, [catalogs?.companies, companyQuery]);

  async function selectUser(id: number) {
    setError(null); setSuccess(null); setLoading(true);
    try { const user = await fetchUser(id); setSelectedId(id); setForm(fromUser(user)); }
    catch (reason) { setError(message(reason)); }
    finally { setLoading(false); }
  }

  function newUser() { setSelectedId(null); setForm({ ...EMPTY_FORM, companyIds: [], roleIds: [] }); setCompanyQuery(''); setError(null); setSuccess(null); }

  function toggleCompany(companyId: number, checked: boolean) {
    setForm((current) => ({
      ...current,
      companyIds: checked
        ? (current.companyIds.includes(companyId) ? current.companyIds : [...current.companyIds, companyId])
        : current.companyIds.filter((id) => id !== companyId),
    }));
  }

  function selectVisibleCompanies() {
    setForm((current) => ({
      ...current,
      companyIds: [...new Set([...current.companyIds, ...visibleCompanies.map((company) => company.id)])],
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null); setSuccess(null);
    const base = { status: form.status, name: form.name, email: form.email, phone: form.phone, functionId: Number(form.functionId), login: form.login, type: form.type, link: form.link, pixKeyType: form.pixKeyType ? Number(form.pixKeyType) : null, pixKey: form.pixKey, companyIds: form.companyIds, ...(canManageAccess ? { roleIds: form.roleIds } : {}) };
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
    <main className={styles.page}>
      <AppPageHeader
        actions={canCreate ? <button className={styles.buttonPrimary} onClick={newUser} type="button">Novo usuário</button> : null}
        subtitle="Cadastro, vínculos, situação e acessos em uma única tela."
        title="Usuários"
        user={currentUser}
      />
      <div className={styles.content}>
        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        {success ? <div className={styles.success} role="status">{success}</div> : null}
        <div className={styles.layout}>
          <section className={styles.listCard}>
            <form className={styles.search} onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedSearch(search.trim()); }}><input onChange={(event) => setSearch(event.target.value)} placeholder="Nome, login ou e-mail" type="search" value={search} /><button className={styles.button} type="submit">Buscar</button></form>
            {loading && !result ? <p>Carregando…</p> : null}
            <div className={styles.userList}>{result?.data.map((user) => <button data-active={selectedId === user.id} key={user.id} onClick={() => void selectUser(user.id)} type="button"><span><strong>{user.name || `Usuário #${user.id}`}</strong><small>@{user.login} · {user.email}</small></span><em data-active={user.status === 1}>{user.status === 1 ? 'Ativo' : 'Inativo'}</em></button>)}</div>
            <div className={styles.pagination}><button className={styles.button} disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} type="button">Anterior</button><span>Página {result?.meta.page ?? page}{result?.meta.totalPages ? ` de ${result.meta.totalPages}` : ''}</span><button className={styles.button} disabled={loading || !result || page >= result.meta.totalPages} onClick={() => setPage((value) => value + 1)} type="button">Próxima</button></div>
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
                  <fieldset className={styles.companyPicker}>
                    <div className={styles.companyPickerHeader}><span>Empresas vinculadas</span><strong>{form.companyIds.length} selecionada(s)</strong></div>
                    <div className={styles.companyPickerBox}>
                      <input className={styles.companySearch} disabled={saving || (!!selectedId && !canEdit)} onChange={(event) => setCompanyQuery(event.target.value)} placeholder="Buscar empresa..." type="search" value={companyQuery} />
                      <div className={styles.companyPickerActions}>
                        <button disabled={saving || (!!selectedId && !canEdit) || visibleCompanies.length === 0} onClick={selectVisibleCompanies} type="button">Selecionar visíveis</button>
                        <button disabled={saving || (!!selectedId && !canEdit) || form.companyIds.length === 0} onClick={() => setForm((current) => ({ ...current, companyIds: [] }))} type="button">Limpar</button>
                      </div>
                      <div className={styles.companyList}>
                        {visibleCompanies.length ? visibleCompanies.map((company) => {
                          const checked = form.companyIds.includes(company.id);
                          return <label className={styles.companyOption} key={company.id}><input checked={checked} disabled={saving || (!!selectedId && !canEdit)} onChange={(event) => toggleCompany(company.id, event.target.checked)} type="checkbox" /><span>{company.name}</span></label>;
                        }) : <div className={styles.companyEmpty}>Nenhuma empresa encontrada.</div>}
                      </div>
                    </div>
                  </fieldset>
                </div>
                {canManageAccess ? <fieldset className={styles.permissions}><legend>Tipos de usuário</legend><p>Selecione os perfis que este usuário receberá. Cada perfil aplica automaticamente o conjunto de permissões configurado em Administração → Permissões.</p><div className={styles.roleGrid}>{catalogs?.roles.map((role) => { const checked = form.roleIds.includes(role.id); return <label className={styles.roleOption} key={role.id}><input checked={checked} disabled={saving || (!!selectedId && !canEdit)} onChange={() => setForm((current) => ({ ...current, roleIds: checked ? current.roleIds.filter((id) => id !== role.id) : [...current.roleIds, role.id] }))} type="checkbox" /><span><strong>{role.name}</strong><small>{role.system ? 'Perfil interno do sistema' : role.slug}</small></span></label>; })}</div></fieldset> : null}
                {(selectedId ? canEdit : canCreate) ? <div className={styles.actions}>{selectedId && form.status === 1 ? <button className={styles.button} disabled={saving || selectedId === currentUser.id || selectedId === 1} onClick={() => void deactivate()} type="button">Desativar</button> : null}<button className={styles.buttonPrimary} disabled={saving} type="submit">{saving ? 'Salvando…' : 'Salvar usuário'}</button></div> : null}
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

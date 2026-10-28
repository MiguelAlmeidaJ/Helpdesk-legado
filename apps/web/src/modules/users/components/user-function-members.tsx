"use client";

import type { UserFunctionActiveMember } from '@helpdesk/contracts';
import { useState } from 'react';
import { NavigationIcon } from '../../../shared/navigation/navigation-icon';
import { appButtonClass } from '../../../shared/ui/button-styles';
import { userInitials } from './user-function-utils';

const PAGE_SIZE = 30;

export function UserFunctionMembers({ users, unassigned = false }: { users: UserFunctionActiveMember[]; unassigned?: boolean }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const query = search.trim().toLocaleLowerCase('pt-BR');
  const filtered = users.filter(user => `${user.name} ${user.login}`.toLocaleLowerCase('pt-BR').includes(query));
  const lastPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return <div className="grid gap-4">
    <div className="flex items-center justify-between gap-3">
      <h3 className="m-0 text-sm font-bold">{unassigned ? 'Ativos sem função' : 'Usuários ativos nesta função'}</h3>
      <span className="rounded-full bg-app-brand-soft px-2.5 py-1 text-xs font-bold text-app-brand">{users.length.toLocaleString('pt-BR')}</span>
    </div>
    {unassigned ? <p className="m-0 text-sm leading-relaxed text-app-muted">Inclui usuários com função vazia ou vinculados a uma função que não existe mais. Usuários inativos ficam fora desta contagem.</p> : null}
    <label className="relative block"><span className="sr-only">Buscar usuário por nome ou login</span><input className="min-h-11 w-full rounded-xl border border-app-border-strong bg-app-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-app-brand" placeholder="Buscar por nome ou login…" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label>
    {visible.length ? <ul className="m-0 grid list-none divide-y divide-app-border p-0">{visible.map(user => <li key={user.id} className="flex items-center gap-3 py-3">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-app-surface-muted text-xs font-extrabold text-app-brand">{userInitials(user.name)}</span>
      <span className="min-w-0 flex-1"><strong className="block break-words text-sm font-semibold">{user.name}</strong><span className="block break-all text-xs text-app-muted">{user.login ? `@${user.login}` : 'Login não informado'} · ID {user.id}</span></span>
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-app-muted"><span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />Ativo</span>
    </li>)}</ul> : <div className="grid justify-items-center gap-2 rounded-xl border border-dashed border-app-border py-10 text-center text-app-muted"><NavigationIcon name="users" className="size-8" /><p className="m-0 text-sm">{search ? 'Nenhum usuário encontrado nesta busca.' : unassigned ? 'Todos os usuários ativos possuem uma função cadastrada.' : 'Nenhum usuário ativo vinculado a esta função.'}</p></div>}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app-border pt-3">
      <span className="text-xs text-app-muted" role="status">{search ? `${filtered.length} de ${users.length} usuários` : `${users.length} ${users.length === 1 ? 'usuário ativo' : 'usuários ativos'}`}{filtered.length > PAGE_SIZE ? ` · página ${currentPage + 1} de ${lastPage + 1}` : ''}</span>
      {filtered.length > PAGE_SIZE ? <div className="flex gap-2"><button type="button" className={appButtonClass('secondary')} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</button><button type="button" className={appButtonClass('secondary')} disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Próxima</button></div> : null}
    </div>
  </div>;
}

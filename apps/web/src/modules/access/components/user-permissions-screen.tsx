"use client";

import {
  type AccessUserPermissionEffect,
  type AccessUserPermissionSnapshot,
  type AccessUserPermissionTarget,
  type CurrentUserResponse,
} from '@helpdesk/contracts';
import { useEffect, useMemo, useState } from 'react';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { appButtonClass } from '../../../shared/ui/button-styles';
import {
  fetchAccessUserPermissions,
  fetchAccessUserTargets,
  updateAccessUserPermissions,
} from '../api/access-management-api';

const PRIMARY = appButtonClass('primary');
const SECONDARY = appButtonClass('secondary');

const MODULE_ORDER = [
  'Atendimento',
  'DevOps',
  'Marketing',
  'Logística',
  'Financeiro',
  'Qualidade',
  'Relatórios',
  'Cadastro',
  'Administração',
] as const;

type OverrideValue = AccessUserPermissionEffect | 'inherit';

function groupPermissions(snapshot: AccessUserPermissionSnapshot | null) {
  const groups = new Map<string, AccessUserPermissionSnapshot['permissions']>();
  for (const permission of snapshot?.permissions ?? []) {
    const rows = groups.get(permission.module) ?? [];
    rows.push(permission);
    groups.set(permission.module, rows);
  }
  const order = new Map<string, number>(
    MODULE_ORDER.map((module, index) => [module, index]),
  );
  return [...groups.entries()].sort(([a], [b]) => {
    const left = order.get(a) ?? Number.MAX_SAFE_INTEGER;
    const right = order.get(b) ?? Number.MAX_SAFE_INTEGER;
    return left - right || a.localeCompare(b, 'pt-BR');
  });
}

export function UserPermissionsScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [users, setUsers] = useState<AccessUserPermissionTarget[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [snapshot, setSnapshot] =
    useState<AccessUserPermissionSnapshot | null>(null);
  const [overrides, setOverrides] = useState<Record<number, OverrideValue>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchAccessUserTargets(controller.signal)
      .then((rows) => {
        setUsers(rows);
        if (rows.length) setSelectedId((current) => current ?? rows[0]!.id);
      })
      .catch((error: unknown) =>
        setMessage(error instanceof Error ? error.message : 'Falha ao carregar usuários.'),
      )
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSnapshot(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setMessage('');
    fetchAccessUserPermissions(selectedId, controller.signal)
      .then((data) => {
        setSnapshot(data);
        setOverrides(
          Object.fromEntries(
            data.permissions.map((permission) => [
              permission.id,
              permission.override ?? 'inherit',
            ]),
          ),
        );
      })
      .catch((error: unknown) =>
        setMessage(error instanceof Error ? error.message : 'Falha ao carregar permissões.'),
      )
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [selectedId]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return users;
    return users.filter((user) =>
      [user.name, user.login, ...user.roles.map((role) => role.name)]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(normalized),
    );
  }, [query, users]);

  const groups = useMemo(() => groupPermissions(snapshot), [snapshot]);

  async function save() {
    if (!snapshot) return;
    setSaving(true);
    setMessage('');
    try {
      await updateAccessUserPermissions(snapshot.user.id, {
        overrides: snapshot.permissions.flatMap((permission) => {
          const effect = overrides[permission.id] ?? 'inherit';
          return effect === 'inherit'
            ? []
            : [{ permissionId: permission.id, effect }];
        }),
      });
      const refreshed = await fetchAccessUserPermissions(snapshot.user.id);
      setSnapshot(refreshed);
      setOverrides(
        Object.fromEntries(
          refreshed.permissions.map((permission) => [
            permission.id,
            permission.override ?? 'inherit',
          ]),
        ),
      );
      setMessage('Permissões diretas salvas com sucesso.');
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        subtitle="Conceda ou negue exceções individuais sem alterar o tipo de usuário."
        title="Permissões por usuário"
        user={currentUser}
      />

      <div className="mx-auto grid w-full max-w-[2100px] grid-cols-[330px_minmax(0,1fr)] gap-4 px-5 py-5 max-[900px]:grid-cols-1 max-sm:px-3 min-[1600px]:grid-cols-[380px_minmax(0,1fr)] min-[1800px]:px-8">
        <aside className="rounded-2xl border border-app-border bg-app-surface p-3 shadow-sm">
          <input
            className="mb-3 min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm outline-none focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar usuário ou tipo..."
            type="search"
            value={query}
          />
          <div className="grid max-h-[720px] gap-1.5 overflow-auto">
            {filteredUsers.map((user) => (
              <button
                className="rounded-lg border border-app-border bg-app-surface px-3 py-2.5 text-left transition hover:border-app-brand data-[active=true]:border-app-brand data-[active=true]:bg-app-brand-soft"
                data-active={selectedId === user.id}
                key={user.id}
                onClick={() => setSelectedId(user.id)}
                type="button"
              >
                <strong className="block text-sm">{user.name}</strong>
                <span className="block text-xs text-app-muted">@{user.login}</span>
                <span className="mt-1 block text-[11px] text-app-subtle">
                  {user.roles.length
                    ? user.roles.map((role) => role.name).join(' · ')
                    : 'Sem tipo atribuído'}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
          {!snapshot ? (
            <div className="grid min-h-[420px] place-items-center p-8 text-sm text-app-muted">
              {loading ? 'Carregando…' : 'Selecione um usuário.'}
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-app-border-soft px-5 py-4">
                <div>
                  <h2 className="m-0 text-xl font-extrabold">{snapshot.user.name}</h2>
                  <p className="mt-1 text-sm text-app-muted">
                    @{snapshot.user.login} ·{' '}
                    {snapshot.user.roles.length
                      ? snapshot.user.roles.map((role) => role.name).join(' · ')
                      : 'Sem tipo atribuído'}
                  </p>
                </div>
                <button className={PRIMARY} disabled={saving || loading} onClick={() => void save()} type="button">
                  {saving ? 'Salvando…' : 'Salvar alterações'}
                </button>
              </header>

              {message ? (
                <div className="border-b border-app-border-soft bg-app-surface-muted px-5 py-3 text-sm">
                  {message}
                </div>
              ) : null}

              <div className="space-y-4 p-4">
                <div className="rounded-xl border border-app-border bg-app-surface-muted/50 px-4 py-3 text-sm text-app-muted-strong">
                  <strong className="text-app-text">Como funciona:</strong>{' '}
                  “Herdar do tipo” usa a permissão configurada no tipo de usuário.
                  “Permitir” concede uma exceção individual e “Negar” remove a permissão
                  deste usuário mesmo que o tipo dele possua o acesso.
                </div>

                {groups.map(([module, permissions]) => (
                  <section className="overflow-hidden rounded-xl border border-app-border" key={module}>
                    <header className="border-b border-app-border-soft bg-app-surface-muted px-4 py-3">
                      <h3 className="m-0 text-sm font-extrabold">{module}</h3>
                    </header>
                    <div className="divide-y divide-app-border-soft">
                      {permissions.map((permission) => {
                        const value = overrides[permission.id] ?? 'inherit';
                        const effective =
                          value === 'allow'
                            ? true
                            : value === 'deny'
                              ? false
                              : permission.roleGranted;
                        return (
                          <div
                            className="grid grid-cols-[minmax(0,1fr)_auto_190px] items-center gap-3 px-4 py-3 max-[700px]:grid-cols-1"
                            key={permission.id}
                          >
                            <div>
                              <strong className="block text-sm">{permission.name}</strong>
                              <span className="text-xs text-app-muted">{permission.description}</span>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                effective
                                  ? 'bg-app-success-soft text-app-success'
                                  : 'bg-app-surface-muted text-app-muted'
                              }`}
                            >
                              {effective ? 'Efetiva' : 'Sem acesso'}
                            </span>
                            <select
                              className="min-h-9 rounded-lg border border-app-border-strong bg-app-surface px-2.5 text-sm outline-none focus:border-app-brand"
                              disabled={saving}
                              onChange={(event) =>
                                setOverrides((current) => ({
                                  ...current,
                                  [permission.id]: event.target.value as OverrideValue,
                                }))
                              }
                              value={value}
                            >
                              <option value="inherit">
                                Herdar do tipo{permission.roleGranted ? ' · permitido' : ' · sem acesso'}
                              </option>
                              <option value="allow">Permitir para este usuário</option>
                              <option value="deny">Negar para este usuário</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <footer className="flex justify-end border-t border-app-border-soft px-5 py-4">
                <button className={SECONDARY} disabled={saving || loading} onClick={() => setSelectedId(snapshot.user.id)} type="button">
                  Recarregar
                </button>
              </footer>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

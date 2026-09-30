"use client";

import type {
  CurrentUserResponse,
  FinanceMasterDataItem,
  FinanceMasterDataKey,
  FinanceMasterDataResponse,
} from '@helpdesk/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { appButtonClass } from '../../../shared/ui/button-styles';
import {
  createFinanceMasterData,
  deleteFinanceMasterData,
  fetchFinanceMasterData,
  setFinanceMasterDataStatus,
  updateFinanceMasterData,
} from '../api/finance-api';

const PRIMARY = appButtonClass('primary');
const SECONDARY = appButtonClass('secondary');
const DANGER = appButtonClass('danger', 'sm');
const INPUT =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)]';

const TABS: Array<{ key: FinanceMasterDataKey; label: string }> = [
  { key: 'groups', label: 'Grupos' },
  { key: 'subgroups', label: 'Subgrupos' },
  { key: 'classifications', label: 'Classificação' },
  { key: 'document-types', label: 'Tipos de Documento' },
  { key: 'payment-methods', label: 'Formas de Pagamento' },
  { key: 'agencies', label: 'Agências Bancárias' },
];

function itemsFor(
  data: FinanceMasterDataResponse,
  key: FinanceMasterDataKey,
): FinanceMasterDataItem[] {
  if (key === 'groups') return data.groups;
  if (key === 'subgroups') return data.subgroups;
  if (key === 'classifications') return data.classifications;
  if (key === 'document-types') return data.documentTypes;
  if (key === 'payment-methods') return data.paymentMethods;
  return data.agencies;
}

export function FinanceMasterDataScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [data, setData] = useState<FinanceMasterDataResponse | null>(null);
  const [tab, setTab] = useState<FinanceMasterDataKey>('groups');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [dialog, setDialog] = useState<FinanceMasterDataItem | 'new' | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [applicable, setApplicable] = useState('Ambos');

  const load = useCallback(async () => {
    try {
      setFeedback('');
      setData(await fetchFinanceMasterData());
    } catch {
      setFeedback('Não foi possível carregar os cadastros financeiros.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => (data ? itemsFor(data, tab) : []), [data, tab]);
  const title = TABS.find((entry) => entry.key === tab)?.label ?? 'Cadastro';

  function openNew() {
    setDialog('new');
    setName('');
    setParentId(data?.groups.find((item) => item.active)?.id.toString() ?? '');
    setApplicable('Ambos');
  }

  function openEdit(item: FinanceMasterDataItem) {
    setDialog(item);
    setName(item.name);
    setParentId(item.parentId ? String(item.parentId) : '');
    setApplicable(item.applicable ?? 'Ambos');
  }

  async function save() {
    if (!name.trim()) return;
    try {
      setBusy(true);
      const payload = {
        name: name.trim(),
        ...(tab === 'subgroups'
          ? {
              parentId: Number(parentId),
              applicable,
            }
          : {}),
      };
      if (dialog === 'new') {
        await createFinanceMasterData(tab, payload);
      } else if (dialog) {
        await updateFinanceMasterData(tab, dialog.id, payload);
      }
      setDialog(null);
      await load();
    } catch {
      setFeedback('Não foi possível salvar o cadastro.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: FinanceMasterDataItem) {
    try {
      setBusy(true);
      await setFinanceMasterDataStatus(tab, item.id, !item.active);
      await load();
    } catch {
      setFeedback('Não foi possível alterar o status.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: FinanceMasterDataItem) {
    if (!window.confirm(`Excluir "${item.name}"?`)) return;
    try {
      setBusy(true);
      await deleteFinanceMasterData(tab, item.id);
      await load();
    } catch {
      setFeedback('Este registro pode estar em uso. Desative-o em vez de excluir.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          <button className={PRIMARY} onClick={openNew} type="button">
            + Novo {title.replace(/s$/, '')}
          </button>
        }
        subtitle="Grupos, classificações e dados usados nos fluxos de RD e financeiro."
        title="Cadastro de Dados Financeiros"
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1500px] px-5 py-5 max-sm:px-3">
        {feedback ? (
          <div className="mb-4 rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger">
            {feedback}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-app-border bg-app-surface-muted p-3">
            {TABS.map((entry) => (
              <button
                className={
                  tab === entry.key
                    ? 'rounded-full border border-app-brand bg-app-brand px-4 py-2 text-sm font-extrabold text-white'
                    : 'rounded-full border border-app-border-strong bg-app-surface px-4 py-2 text-sm font-bold text-app-text-soft transition hover:bg-app-surface-hover'
                }
                key={entry.key}
                onClick={() => setTab(entry.key)}
                type="button"
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-app-surface-muted text-left text-xs uppercase tracking-wide text-app-muted">
                  <th className="px-4 py-3">Nome</th>
                  {tab === 'subgroups' ? <th className="px-4 py-3">Grupo</th> : null}
                  {tab === 'subgroups' ? <th className="px-4 py-3">Aplicável</th> : null}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border-soft">
                {items.map((item) => {
                  const parent = data?.groups.find((group) => group.id === item.parentId);
                  return (
                    <tr key={item.id} className="hover:bg-app-surface-hover">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      {tab === 'subgroups' ? <td className="px-4 py-3 text-app-muted">{parent?.name ?? '—'}</td> : null}
                      {tab === 'subgroups' ? <td className="px-4 py-3 text-app-muted">{item.applicable ?? 'Ambos'}</td> : null}
                      <td className="px-4 py-3">
                        <span className={item.active ? 'inline-flex rounded-full bg-app-success-soft px-2.5 py-1 text-xs font-extrabold text-app-success' : 'inline-flex rounded-full bg-app-surface-muted px-2.5 py-1 text-xs font-extrabold text-app-muted'}>
                          {item.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button className={SECONDARY} disabled={busy} onClick={() => void toggle(item)} type="button">
                            {item.active ? 'Desativar' : 'Ativar'}
                          </button>
                          <button className={SECONDARY} disabled={busy} onClick={() => openEdit(item)} type="button">Editar</button>
                          <button className={DANGER} disabled={busy} onClick={() => void remove(item)} type="button">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!items.length ? (
                  <tr><td className="px-4 py-10 text-center text-app-muted" colSpan={tab === 'subgroups' ? 5 : 3}>Nenhum registro encontrado.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {dialog ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4">
          <section className="w-full max-w-lg rounded-2xl border border-app-border bg-app-surface p-5 shadow-2xl">
            <div className="mb-4">
              <h2 className="m-0 text-xl font-extrabold">{dialog === 'new' ? `Novo · ${title}` : `Editar · ${title}`}</h2>
              <p className="m-0 mt-1 text-sm text-app-muted">Atualize os dados usados nos lançamentos financeiros.</p>
            </div>
            <div className="grid gap-4">
              <label className="grid gap-1.5 text-xs font-bold text-app-muted">
                Nome
                <input className={INPUT} maxLength={100} onChange={(event) => setName(event.target.value)} value={name} />
              </label>
              {tab === 'subgroups' ? (
                <>
                  <label className="grid gap-1.5 text-xs font-bold text-app-muted">
                    Grupo
                    <select className={INPUT} onChange={(event) => setParentId(event.target.value)} value={parentId}>
                      <option value="">Selecione</option>
                      {data?.groups.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-bold text-app-muted">
                    Aplicável
                    <select className={INPUT} onChange={(event) => setApplicable(event.target.value)} value={applicable}>
                      <option value="Ambos">Ambos</option>
                      <option value="RD">RD</option>
                      <option value="Financeiro">Financeiro</option>
                    </select>
                  </label>
                </>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className={SECONDARY} disabled={busy} onClick={() => setDialog(null)} type="button">Cancelar</button>
              <button className={PRIMARY} disabled={busy || !name.trim() || (tab === 'subgroups' && !parentId)} onClick={() => void save()} type="button">{busy ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

"use client";

import type {
  CategoryChildWriteInput,
  CategoryItemRecord,
  CategorySubcategoryRecord,
  CategoryTreeResponse,
} from '@helpdesk/contracts';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import {
  createCategoryItem,
  createSubcategory,
  fetchCategoryTree,
  updateCategoryItem,
  updateSubcategory,
} from '../api/registrations-api';

const BUTTON =
  'inline-flex min-h-9 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface px-3 text-xs font-bold text-app-text-soft transition hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY = `${BUTTON} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;
const INPUT =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const message = (reason.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(' ');
  }
  return reason instanceof Error ? reason.message : 'Não foi possível concluir a operação.';
}

type Editor =
  | { kind: 'subcategory'; record: CategorySubcategoryRecord | null }
  | { kind: 'item'; subcategoryId: number; record: CategoryItemRecord | null }
  | null;

export function CategoryTreePanel({ categoryId }: { categoryId: number }) {
  const [data, setData] = useState<CategoryTreeResponse | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [input, setInput] = useState<CategoryChildWriteInput>({ name: '', status: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchCategoryTree(categoryId, signal));
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function openSubcategory(record: CategorySubcategoryRecord | null) {
    setEditor({ kind: 'subcategory', record });
    setInput(record ? { name: record.name, status: record.status } : { name: '', status: 1 });
  }

  function openItem(subcategoryId: number, record: CategoryItemRecord | null) {
    setEditor({ kind: 'item', subcategoryId, record });
    setInput(record ? { name: record.name, status: record.status } : { name: '', status: 1 });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    setError('');
    try {
      if (editor.kind === 'subcategory') {
        if (editor.record) {
          await updateSubcategory(categoryId, editor.record.id, input);
        } else {
          await createSubcategory(categoryId, input);
        }
      } else if (editor.record) {
        await updateCategoryItem(categoryId, editor.subcategoryId, editor.record.id, input);
      } else {
        await createCategoryItem(categoryId, editor.subcategoryId, input);
      }
      setEditor(null);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 border-t border-app-border-soft pt-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="m-0 text-base font-bold text-app-text">Subcategorias e itens</h3>
          <p className="m-0 mt-1 text-xs text-app-muted">
            Estrutura usada na classificação dos atendimentos.
          </p>
        </div>
        {data?.canCreateSubcategories ? (
          <button className={PRIMARY} onClick={() => openSubcategory(null)} type="button">
            Nova subcategoria
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-app-danger-border bg-app-danger-soft px-3 py-2 text-xs text-app-danger">
          {error}
        </div>
      ) : null}

      {editor ? (
        <form className="mb-4 grid gap-3 rounded-xl border border-app-border bg-app-surface-muted p-4 md:grid-cols-[minmax(0,1fr)_180px_auto]" onSubmit={save}>
          <label className="grid gap-1 text-xs font-semibold">
            {editor.kind === 'subcategory' ? 'Nome da subcategoria' : 'Nome do item'}
            <input className={INPUT} maxLength={50} onChange={(event) => setInput({ ...input, name: event.target.value })} required value={input.name} />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            Situação
            <select className={INPUT} onChange={(event) => setInput({ ...input, status: event.target.value === '1' ? 1 : 0 })} value={input.status}>
              <option value="1">Ativo</option>
              <option value="0">Inativo</option>
            </select>
          </label>
          <div className="flex items-end justify-end gap-2">
            <button className={BUTTON} onClick={() => setEditor(null)} type="button">Cancelar</button>
            <button className={PRIMARY} disabled={saving} type="submit">{saving ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </form>
      ) : null}

      {loading && !data ? (
        <div className="rounded-xl border border-app-border bg-app-surface-muted p-4 text-sm text-app-muted">
          Carregando estrutura…
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-3">
          {data.subcategories.map((subcategory) => (
            <div className="rounded-xl border border-app-border bg-app-surface-muted p-4" key={subcategory.id}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm">{subcategory.name}</strong>
                  <span className={subcategory.status === 1 ? 'text-[10px] font-black uppercase text-app-success' : 'text-[10px] font-black uppercase text-app-muted'}>
                    {subcategory.status === 1 ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {data.canCreateItems ? (
                    <button className={PRIMARY} onClick={() => openItem(subcategory.id, null)} type="button">
                      Novo item
                    </button>
                  ) : null}
                  {data.canEditSubcategories ? (
                    <button className={BUTTON} onClick={() => openSubcategory(subcategory)} type="button">
                      Editar
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {subcategory.items.map((item) => (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2" key={item.id}>
                    <div className="min-w-0">
                      <strong className="block truncate text-xs">{item.name}</strong>
                      <span className={item.status === 1 ? 'text-[9px] font-black uppercase text-app-success' : 'text-[9px] font-black uppercase text-app-muted'}>
                        {item.status === 1 ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    {data.canEditItems ? (
                      <button className={BUTTON} onClick={() => openItem(subcategory.id, item)} type="button">Editar</button>
                    ) : null}
                  </div>
                ))}
                {!subcategory.items.length ? <p className="m-0 text-xs text-app-muted">Nenhum item cadastrado.</p> : null}
              </div>
            </div>
          ))}
          {!data.subcategories.length ? (
            <div className="rounded-xl border border-app-border bg-app-surface-muted p-4 text-sm text-app-muted">
              Nenhuma subcategoria cadastrada.
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

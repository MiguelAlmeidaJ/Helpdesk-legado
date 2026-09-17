"use client";

import type {
  TicketCatalogOption,
  TicketProjectTaskUpdateRequest,
  TicketProjectUpdateRequest,
} from '@helpdesk/contracts';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import {
  fetchDevOpsCreateCatalogs,
  fetchDevOpsItems,
  fetchDevOpsSubcategories,
} from '../api/modular-ticket-create-api';

const PRIMARY_BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-app-brand bg-app-brand px-4 text-sm font-bold text-white transition-colors hover:bg-app-brand-hover disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-950';
const CONTROL_CLASS =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 py-2 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';
const FIELD_CLASS = 'grid min-w-0 gap-1.5 text-sm font-semibold text-app-text-soft';

export interface DevOpsEditableClassification {
  typeId: number | null;
  categoryId: number | null;
  subcategoryId: number | null;
  itemId: number | null;
  levelId: number | null;
  formId: number | null;
  openingDescription: string | null;
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const message = (reason.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  if (reason instanceof ApiError && reason.status === 403) {
    return 'Você não possui permissão para editar esta classificação DevOps.';
  }
  if (reason instanceof ApiError) return `A API respondeu com erro ${reason.status}.`;
  return reason instanceof Error ? reason.message : 'Não foi possível salvar a classificação DevOps.';
}

function Options({ values }: { values: TicketCatalogOption[] }) {
  return values.map((option) => (
    <option key={option.id} value={option.id}>{option.name}</option>
  ));
}

export function DevOpsTicketClassificationEditor({
  resourceLabel,
  value,
  onSave,
  onChanged,
}: {
  resourceLabel: string;
  value: DevOpsEditableClassification;
  onSave: (input: TicketProjectTaskUpdateRequest | TicketProjectUpdateRequest) => Promise<void>;
  onChanged: () => void;
}) {
  const [types, setTypes] = useState<TicketCatalogOption[]>([]);
  const [categories, setCategories] = useState<TicketCatalogOption[]>([]);
  const [levels, setLevels] = useState<TicketCatalogOption[]>([]);
  const [forms, setForms] = useState<TicketCatalogOption[]>([]);
  const [subcategories, setSubcategories] = useState<TicketCatalogOption[]>([]);
  const [items, setItems] = useState<TicketCatalogOption[]>([]);
  const [typeId, setTypeId] = useState(String(value.typeId ?? 0));
  const [categoryId, setCategoryId] = useState(String(value.categoryId ?? ''));
  const [subcategoryId, setSubcategoryId] = useState(String(value.subcategoryId ?? 0));
  const [itemId, setItemId] = useState(String(value.itemId ?? 0));
  const [levelId, setLevelId] = useState(String(value.levelId ?? 0));
  const [formId, setFormId] = useState(String(value.formId ?? 1));
  const [description, setDescription] = useState(value.openingDescription ?? '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFeedback(null);

    Promise.all([
      fetchDevOpsCreateCatalogs(),
      value.categoryId && value.categoryId > 0
        ? fetchDevOpsSubcategories(value.categoryId)
        : Promise.resolve<TicketCatalogOption[]>([]),
      value.subcategoryId && value.subcategoryId > 0
        ? fetchDevOpsItems(value.subcategoryId)
        : Promise.resolve<TicketCatalogOption[]>([]),
    ])
      .then(([catalogs, initialSubcategories, initialItems]) => {
        if (!active) return;
        setTypes(catalogs.types);
        setCategories(catalogs.categories);
        setLevels(catalogs.levels);
        setForms(catalogs.forms);
        setSubcategories(initialSubcategories);
        setItems(initialItems);
      })
      .catch((reason: unknown) => {
        if (active) setFeedback(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [value.categoryId, value.subcategoryId]);

  useEffect(() => {
    setTypeId(String(value.typeId ?? 0));
    setCategoryId(String(value.categoryId ?? ''));
    setSubcategoryId(String(value.subcategoryId ?? 0));
    setItemId(String(value.itemId ?? 0));
    setLevelId(String(value.levelId ?? 0));
    setFormId(String(value.formId ?? 1));
    setDescription(value.openingDescription ?? '');
  }, [value]);

  async function changeCategory(next: string) {
    setCategoryId(next);
    setSubcategoryId('0');
    setItemId('0');
    setSubcategories([]);
    setItems([]);
    if (!next) return;
    try {
      setSubcategories(await fetchDevOpsSubcategories(Number(next)));
    } catch (reason) {
      setFeedback(errorMessage(reason));
    }
  }

  async function changeSubcategory(next: string) {
    setSubcategoryId(next);
    setItemId('0');
    setItems([]);
    if (!next || next === '0') return;
    try {
      setItems(await fetchDevOpsItems(Number(next)));
    } catch (reason) {
      setFeedback(errorMessage(reason));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await onSave({
        typeId: Number(typeId),
        categoryId: Number(categoryId),
        subcategoryId: Number(subcategoryId),
        itemId: Number(itemId),
        levelId: Number(levelId),
        formId: Number(formId),
        openingDescription: description,
      });
      setFeedback('Classificação atualizada.');
      onChanged();
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="mb-4 rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm shadow-slate-950/5 dark:shadow-black/10"
      aria-label={`Editar ${resourceLabel}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
            Classificação
          </span>
          <h2 className="m-0 text-lg font-bold text-app-text">Editar {resourceLabel}</h2>
          <p className="mt-1 text-sm text-app-muted">Altera somente classificação, forma e descrição de abertura.</p>
        </div>
        {loading ? <span className="text-sm text-app-muted">Carregando catálogos…</span> : null}
      </div>

      {feedback ? (
        <div className="mb-3.5 whitespace-pre-wrap rounded-lg border border-app-border bg-app-surface-muted px-3 py-2.5 text-sm text-app-text-soft" role="status">
          {feedback}
        </div>
      ) : null}

      <form onSubmit={submit}>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <label className={FIELD_CLASS}><span>Tipo</span><select className={CONTROL_CLASS} disabled={loading || saving} onChange={(event) => setTypeId(event.target.value)} value={typeId}><Options values={types} /></select></label>
          <label className={FIELD_CLASS}><span>Categoria</span><select className={CONTROL_CLASS} disabled={loading || saving} onChange={(event) => void changeCategory(event.target.value)} required value={categoryId}><option value="">Selecione</option><Options values={categories} /></select></label>
          <label className={FIELD_CLASS}><span>Subcategoria</span><select className={CONTROL_CLASS} disabled={loading || saving || !categoryId} onChange={(event) => void changeSubcategory(event.target.value)} value={subcategoryId}><option value="0">Não informado</option><Options values={subcategories.filter((option) => option.id > 0)} /></select></label>
          <label className={FIELD_CLASS}><span>Item</span><select className={CONTROL_CLASS} disabled={loading || saving || subcategoryId === '0'} onChange={(event) => setItemId(event.target.value)} value={itemId}><option value="0">Não informado</option><Options values={items.filter((option) => option.id > 0)} /></select></label>
          <label className={FIELD_CLASS}><span>Nível</span><select className={CONTROL_CLASS} disabled={loading || saving} onChange={(event) => setLevelId(event.target.value)} value={levelId}><Options values={levels} /></select></label>
          <label className={FIELD_CLASS}><span>Forma</span><select className={CONTROL_CLASS} disabled={loading || saving} onChange={(event) => setFormId(event.target.value)} required value={formId}><Options values={forms} /></select></label>
          <label className={`${FIELD_CLASS} sm:col-span-2 lg:col-span-3`}><span>Descrição de abertura</span><textarea className={`${CONTROL_CLASS} min-h-30 resize-y`} disabled={saving} maxLength={10000} onChange={(event) => setDescription(event.target.value)} rows={5} value={description} /></label>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2.5">
          <button className={PRIMARY_BUTTON_CLASS} disabled={loading || saving || !categoryId} type="submit">{saving ? 'Salvando…' : 'Salvar classificação'}</button>
        </div>
      </form>
    </section>
  );
}

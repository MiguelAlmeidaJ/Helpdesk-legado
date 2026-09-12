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
import styles from './specialized-ticket-classification-editor.module.css';

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
    <section className={styles.card} aria-label={`Editar ${resourceLabel}`}>
      <div className={styles.header}>
        <div>
          <span className="eyebrow">Classificação</span>
          <h2>Editar {resourceLabel}</h2>
          <p>Altera somente classificação, forma e descrição de abertura.</p>
        </div>
        {loading ? <span className={styles.muted}>Carregando catálogos…</span> : null}
      </div>

      {feedback ? <div className={styles.feedback} role="status">{feedback}</div> : null}

      <form onSubmit={submit}>
        <div className={styles.grid}>
          <label><span>Tipo</span><select disabled={loading || saving} onChange={(event) => setTypeId(event.target.value)} value={typeId}><Options values={types} /></select></label>
          <label><span>Categoria</span><select disabled={loading || saving} onChange={(event) => void changeCategory(event.target.value)} required value={categoryId}><option value="">Selecione</option><Options values={categories} /></select></label>
          <label><span>Subcategoria</span><select disabled={loading || saving || !categoryId} onChange={(event) => void changeSubcategory(event.target.value)} value={subcategoryId}><option value="0">Não informado</option><Options values={subcategories.filter((option) => option.id > 0)} /></select></label>
          <label><span>Item</span><select disabled={loading || saving || subcategoryId === '0'} onChange={(event) => setItemId(event.target.value)} value={itemId}><option value="0">Não informado</option><Options values={items.filter((option) => option.id > 0)} /></select></label>
          <label><span>Nível</span><select disabled={loading || saving} onChange={(event) => setLevelId(event.target.value)} value={levelId}><Options values={levels} /></select></label>
          <label><span>Forma</span><select disabled={loading || saving} onChange={(event) => setFormId(event.target.value)} required value={formId}><Options values={forms} /></select></label>
          <label className={styles.description}><span>Descrição de abertura</span><textarea disabled={saving} maxLength={10000} onChange={(event) => setDescription(event.target.value)} rows={5} value={description} /></label>
        </div>
        <div className={styles.actions}>
          <button className="button button-primary" disabled={loading || saving || !categoryId} type="submit">{saving ? 'Salvando…' : 'Salvar classificação'}</button>
        </div>
      </form>
    </section>
  );
}

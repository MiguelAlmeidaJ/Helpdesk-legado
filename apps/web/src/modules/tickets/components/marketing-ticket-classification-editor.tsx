"use client";

import type {
  MarketingTicketDetailResponse,
  MarketingTicketUpdateRequest,
  TicketCatalogOption,
} from '@helpdesk/contracts';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { fetchMarketingCreateCatalogs } from '../api/modular-ticket-create-api';
import styles from './specialized-ticket-classification-editor.module.css';

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const message = (reason.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  if (reason instanceof ApiError && reason.status === 403) {
    return 'Você não possui permissão para editar este ticket de Marketing.';
  }
  if (reason instanceof ApiError) return `A API respondeu com erro ${reason.status}.`;
  return reason instanceof Error ? reason.message : 'Não foi possível salvar a classificação de Marketing.';
}

function Options({ values }: { values: TicketCatalogOption[] }) {
  return values.map((option) => (
    <option key={option.id} value={option.id}>{option.name}</option>
  ));
}

export function MarketingTicketClassificationEditor({
  ticket,
  onSave,
  onChanged,
}: {
  ticket: MarketingTicketDetailResponse;
  onSave: (input: MarketingTicketUpdateRequest) => Promise<void>;
  onChanged: () => void;
}) {
  const [types, setTypes] = useState<TicketCatalogOption[]>([]);
  const [categories, setCategories] = useState<TicketCatalogOption[]>([]);
  const [subcategories, setSubcategories] = useState<TicketCatalogOption[]>([]);
  const [levels, setLevels] = useState<TicketCatalogOption[]>([]);
  const [forms, setForms] = useState<TicketCatalogOption[]>([]);
  const [typeId, setTypeId] = useState(String(ticket.type.id ?? ''));
  const [categoryId, setCategoryId] = useState(String(ticket.category.id ?? ''));
  const [subcategoryId, setSubcategoryId] = useState(String(ticket.subcategory.id ?? ''));
  const [levelId, setLevelId] = useState(String(ticket.level.id ?? ''));
  const [formId, setFormId] = useState(String(ticket.form ?? 1));
  const [description, setDescription] = useState(ticket.openingDescription ?? '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchMarketingCreateCatalogs()
      .then((catalogs) => {
        if (!active) return;
        setTypes(catalogs.types);
        setCategories(catalogs.categories);
        setSubcategories(catalogs.subcategories);
        setLevels(catalogs.levels);
        setForms(catalogs.forms);
      })
      .catch((reason: unknown) => {
        if (active) setFeedback(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setTypeId(String(ticket.type.id ?? ''));
    setCategoryId(String(ticket.category.id ?? ''));
    setSubcategoryId(String(ticket.subcategory.id ?? ''));
    setLevelId(String(ticket.level.id ?? ''));
    setFormId(String(ticket.form ?? 1));
    setDescription(ticket.openingDescription ?? '');
  }, [ticket]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await onSave({
        typeId: Number(typeId),
        categoryId: Number(categoryId),
        subcategoryId: Number(subcategoryId),
        itemId: ticket.item.id ?? 0,
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
    <section className={styles.card} aria-label="Editar classificação de Marketing">
      <div className={styles.header}>
        <div>
          <span className="eyebrow">Classificação</span>
          <h2>Editar ticket de Marketing</h2>
          <p>Preserva cliente, solicitante, local, técnico e abertura.</p>
        </div>
        {loading ? <span className={styles.muted}>Carregando catálogos…</span> : null}
      </div>

      {feedback ? <div className={styles.feedback} role="status">{feedback}</div> : null}

      <form onSubmit={submit}>
        <div className={styles.grid}>
          <label><span>Tipo</span><select disabled={loading || saving} onChange={(event) => setTypeId(event.target.value)} required value={typeId}><option value="">Selecione</option><Options values={types} /></select></label>
          <label><span>Categoria</span><select disabled={loading || saving} onChange={(event) => setCategoryId(event.target.value)} required value={categoryId}><option value="">Selecione</option><Options values={categories} /></select></label>
          <label><span>Subcategoria</span><select disabled={loading || saving} onChange={(event) => setSubcategoryId(event.target.value)} required value={subcategoryId}><option value="">Selecione</option><Options values={subcategories} /></select></label>
          <label><span>Nível</span><select disabled={loading || saving} onChange={(event) => setLevelId(event.target.value)} required value={levelId}><option value="">Selecione</option><Options values={levels} /></select></label>
          <label><span>Forma</span><select disabled={loading || saving} onChange={(event) => setFormId(event.target.value)} required value={formId}><Options values={forms} /></select></label>
          <label className={styles.description}><span>Descrição de abertura</span><textarea disabled={saving} maxLength={10000} onChange={(event) => setDescription(event.target.value)} required rows={5} value={description} /></label>
        </div>
        <div className={styles.actions}>
          <button className="button button-primary" disabled={loading || saving} type="submit">{saving ? 'Salvando…' : 'Salvar classificação'}</button>
        </div>
      </form>
    </section>
  );
}

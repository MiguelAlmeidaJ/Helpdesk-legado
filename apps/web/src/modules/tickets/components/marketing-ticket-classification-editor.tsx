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

const PRIMARY_BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-app-brand bg-app-brand px-4 text-sm font-bold text-white transition-colors hover:bg-app-brand-hover disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-950';
const CONTROL_CLASS =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 py-2 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';
const FIELD_CLASS = 'grid min-w-0 gap-1.5 text-sm font-semibold text-app-text-soft';

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
    <section
      className="mb-4 rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm shadow-slate-950/5 dark:shadow-black/10"
      aria-label="Editar classificação de Marketing"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
            Classificação
          </span>
          <h2 className="m-0 text-lg font-bold text-app-text">Editar ticket de Marketing</h2>
          <p className="mt-1 text-sm text-app-muted">Preserva cliente, solicitante, local, técnico e abertura.</p>
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
          <label className={FIELD_CLASS}><span>Tipo</span><select className={CONTROL_CLASS} disabled={loading || saving} onChange={(event) => setTypeId(event.target.value)} required value={typeId}><option value="">Selecione</option><Options values={types} /></select></label>
          <label className={FIELD_CLASS}><span>Categoria</span><select className={CONTROL_CLASS} disabled={loading || saving} onChange={(event) => setCategoryId(event.target.value)} required value={categoryId}><option value="">Selecione</option><Options values={categories} /></select></label>
          <label className={FIELD_CLASS}><span>Subcategoria</span><select className={CONTROL_CLASS} disabled={loading || saving} onChange={(event) => setSubcategoryId(event.target.value)} required value={subcategoryId}><option value="">Selecione</option><Options values={subcategories} /></select></label>
          <label className={FIELD_CLASS}><span>Nível</span><select className={CONTROL_CLASS} disabled={loading || saving} onChange={(event) => setLevelId(event.target.value)} required value={levelId}><option value="">Selecione</option><Options values={levels} /></select></label>
          <label className={FIELD_CLASS}><span>Forma</span><select className={CONTROL_CLASS} disabled={loading || saving} onChange={(event) => setFormId(event.target.value)} required value={formId}><Options values={forms} /></select></label>
          <label className={`${FIELD_CLASS} sm:col-span-2 lg:col-span-3`}><span>Descrição de abertura</span><textarea className={`${CONTROL_CLASS} min-h-30 resize-y`} disabled={saving} maxLength={10000} onChange={(event) => setDescription(event.target.value)} required rows={5} value={description} /></label>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2.5">
          <button className={PRIMARY_BUTTON_CLASS} disabled={loading || saving} type="submit">{saving ? 'Salvando…' : 'Salvar classificação'}</button>
        </div>
      </form>
    </section>
  );
}

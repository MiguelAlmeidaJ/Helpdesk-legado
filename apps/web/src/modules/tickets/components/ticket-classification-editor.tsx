"use client";

import {
  AppPermission,
  PermissionScope,
  type CurrentUserResponse,
  type TicketCatalogOption,
  type TicketDetailResponse,
} from '@helpdesk/contracts';
import { type FormEvent, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import {
  fetchTicketClassificationCatalogs,
  fetchTicketDetail,
  fetchTicketItems,
  fetchTicketSubcategories,
  updateTicketClassification,
} from '../api/tickets-api';
const styles = {
  card: 'overflow-hidden rounded-xl border border-app-border bg-app-surface',
  header:
    'flex items-center justify-between gap-3 border-b border-app-border-soft bg-app-surface-muted px-4 py-2.5 max-[600px]:flex-col max-[600px]:items-stretch [&_h2]:m-0 [&_h2]:text-[15px] [&_span]:text-[11px] [&_span]:text-app-subtle [&_button]:min-h-[34px] [&_button]:rounded-lg [&_button]:border [&_button]:border-app-brand [&_button]:bg-app-surface [&_button]:px-3 [&_button]:text-[10px] [&_button]:font-extrabold [&_button]:text-app-brand [&_button]:transition [&_button:hover]:bg-app-brand-soft [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50',
  form:
    'grid grid-cols-1 gap-3 px-4 py-3.5 min-[601px]:grid-cols-2 min-[901px]:grid-cols-4 [&_label]:grid [&_label]:gap-[5px] [&_label]:text-[10px] [&_label]:font-extrabold [&_label]:uppercase [&_label]:text-app-muted [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-2.5 [&_select]:py-2 [&_select]:text-xs [&_select]:text-app-text [&_select]:outline-none [&_select]:transition [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-app-border-strong [&_textarea]:bg-app-surface [&_textarea]:px-2.5 [&_textarea]:py-2 [&_textarea]:text-xs [&_textarea]:text-app-text [&_textarea]:outline-none [&_textarea]:transition [&_select:focus]:border-app-brand [&_select:focus]:ring-3 [&_select:focus]:ring-[var(--app-brand-ring)] [&_textarea:focus]:border-app-brand [&_textarea:focus]:ring-3 [&_textarea:focus]:ring-[var(--app-brand-ring)]',
  description: 'col-span-full',
  footer:
    'col-span-full flex items-center justify-between gap-3 max-[600px]:flex-col max-[600px]:items-stretch [&_small]:text-app-subtle [&_button]:min-h-[34px] [&_button]:rounded-lg [&_button]:border [&_button]:border-app-brand [&_button]:bg-app-brand [&_button]:px-3 [&_button]:text-[10px] [&_button]:font-extrabold [&_button]:text-white dark:[&_button]:text-slate-950 [&_button]:transition [&_button:hover]:bg-app-brand-hover [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50',
  feedback:
    'border-t border-app-border-soft bg-app-surface-hover px-4 py-[9px] text-[11px] text-app-muted',
} as const;

function canEdit(user: CurrentUserResponse, ticket: TicketDetailResponse) {
  if (user.grants.some((g) => g.permission === AppPermission.SystemAdmin)) {
    return true;
  }
  const grant = user.grants.find(
    (g) => g.permission === AppPermission.TicketsClassify,
  );
  return grant?.scope === PermissionScope.All ||
    (grant?.scope === PermissionScope.Own &&
      ticket.technician.id === user.id);
}

export function TicketClassificationEditor({
  currentUser,
  ticket,
  onUpdated,
}: {
  currentUser: CurrentUserResponse;
  ticket: TicketDetailResponse;
  onUpdated: (ticket: TicketDetailResponse) => void;
}) {
  const allowed = canEdit(currentUser, ticket);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [types, setTypes] = useState<TicketCatalogOption[]>([]);
  const [levels, setLevels] = useState<TicketCatalogOption[]>([]);
  const [priorities, setPriorities] = useState<TicketCatalogOption[]>([]);
  const [forms, setForms] = useState<TicketCatalogOption[]>([]);
  const [categories, setCategories] = useState<TicketCatalogOption[]>([]);
  const [subcategories, setSubcategories] = useState<TicketCatalogOption[]>([]);
  const [items, setItems] = useState<TicketCatalogOption[]>([]);
  const [typeId, setTypeId] = useState(ticket.type.code ?? 0);
  const [categoryId, setCategoryId] = useState(ticket.classification.category.id ?? 0);
  const [subcategoryId, setSubcategoryId] = useState(ticket.classification.subcategory.id ?? 0);
  const [itemId, setItemId] = useState(ticket.classification.item.id ?? 0);
  const [levelId, setLevelId] = useState(ticket.level.code ?? 0);
  const [priorityId, setPriorityId] = useState(ticket.priority.code ?? 0);
  const [formId, setFormId] = useState(ticket.form.code ?? 1);
  const [description, setDescription] = useState(ticket.openingDescription ?? '');

  if (!allowed) return null;

  async function load() {
    setLoading(true);
    setFeedback(null);
    try {
      const catalogs = await fetchTicketClassificationCatalogs();
      setTypes(catalogs.types);
      setLevels(catalogs.levels);
      setPriorities(catalogs.priorities);
      setForms(catalogs.forms);
      setCategories(catalogs.categories);
      setSubcategories(
        await fetchTicketSubcategories(ticket.classification.category.id ?? 0),
      );
      setItems(
        await fetchTicketItems(ticket.classification.subcategory.id ?? 0),
      );
      setOpen(true);
    } catch {
      setFeedback('Não foi possível carregar os catálogos.');
    } finally {
      setLoading(false);
    }
  }

  async function changeCategory(value: number) {
    setCategoryId(value);
    setSubcategoryId(0);
    setItemId(0);
    setItems([{ id: 0, name: 'Não informado' }]);
    try {
      setSubcategories(await fetchTicketSubcategories(value));
    } catch {
      setFeedback('Não foi possível carregar as subcategorias.');
    }
  }

  async function changeSubcategory(value: number) {
    setSubcategoryId(value);
    setItemId(0);
    try {
      setItems(await fetchTicketItems(value));
    } catch {
      setFeedback('Não foi possível carregar os itens.');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await updateTicketClassification(ticket.id, {
        typeId,
        categoryId,
        subcategoryId,
        itemId,
        levelId,
        priorityId,
        formId,
        openingDescription: description,
      });
      onUpdated(await fetchTicketDetail(ticket.id));
      setOpen(false);
      setFeedback('Classificação atualizada.');
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 400) {
        setFeedback('A classificação escolhida é inválida.');
      } else if (error instanceof ApiError && error.status === 403) {
        setFeedback('Seu usuário não pode editar esta classificação.');
      } else {
        setFeedback('Não foi possível atualizar a classificação.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <h2>Editar classificação</h2>
          <span>Tipo, catálogo, nível, prioridade e forma</span>
        </div>
        <button
          disabled={loading || saving}
          onClick={() => open ? setOpen(false) : void load()}
          type="button"
        >
          {loading ? 'Carregando…' : open ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      {open ? (
        <form className={styles.form} onSubmit={submit}>
          <label>Tipo<select value={typeId} onChange={(e) => setTypeId(Number(e.target.value))}>
            {types.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select></label>
          <label>Categoria<select value={categoryId} onChange={(e) => void changeCategory(Number(e.target.value))}>
            {categories.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select></label>
          <label>Subcategoria<select value={subcategoryId} onChange={(e) => void changeSubcategory(Number(e.target.value))}>
            {subcategories.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select></label>
          <label>Item<select value={itemId} onChange={(e) => setItemId(Number(e.target.value))}>
            {items.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select></label>
          <label>Nível<select value={levelId} onChange={(e) => setLevelId(Number(e.target.value))}>
            {levels.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select></label>
          <label>Prioridade<select value={priorityId} onChange={(e) => setPriorityId(Number(e.target.value))}>
            {priorities.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select></label>
          <label>Forma<select value={formId} onChange={(e) => setFormId(Number(e.target.value))}>
            {forms.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select></label>
          <label className={styles.description}>Descrição de abertura
            <textarea maxLength={10000} required rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className={styles.footer}>
            <small>{description.length.toLocaleString('pt-BR')}/10.000</small>
            <button disabled={saving || !description.trim()} type="submit">
              {saving ? 'Salvando…' : 'Salvar classificação'}
            </button>
          </div>
        </form>
      ) : null}
      {feedback ? <div className={styles.feedback}>{feedback}</div> : null}
    </section>
  );
}

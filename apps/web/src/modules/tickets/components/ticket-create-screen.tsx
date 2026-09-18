"use client";

import type {
  CurrentUserResponse,
  TicketCatalogOption,
  TicketCreateCatalogsResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import {
  createTicket,
  fetchTicketCreateCatalogs,
  fetchTicketCreateItems,
  fetchTicketCreateSubcategories,
  fetchTicketLocations,
  fetchTicketRequesters,
} from '../api/tickets-api';

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft no-underline transition-colors hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_BUTTON_CLASS = `${BUTTON_CLASS} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;
const FIELD_LABEL_CLASS = 'grid min-w-0 gap-1.5 text-xs font-extrabold text-app-muted';
const FIELD_CONTROL_CLASS =
  'min-h-10 w-full min-w-0 rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';
const TEXTAREA_CLASS = `${FIELD_CONTROL_CLASS} resize-y py-2.5`;

function localDateTime(): string {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return now.toISOString().slice(0, 16);
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const message = (reason.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  return reason instanceof ApiError
    ? `A API respondeu com erro ${reason.status}.`
    : 'Não foi possível concluir a operação.';
}

function Options({ values }: { values: TicketCatalogOption[] }) {
  return values.map((option) => (
    <option key={option.id} value={option.id}>
      {option.name}
    </option>
  ));
}

export function TicketCreateScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const router = useRouter();
  const [createCatalogs, setCreateCatalogs] =
    useState<TicketCreateCatalogsResponse | null>(null);
  const [requesters, setRequesters] = useState<TicketCatalogOption[]>([]);
  const [locations, setLocations] = useState<TicketCatalogOption[]>([]);
  const [subcategories, setSubcategories] = useState<TicketCatalogOption[]>([]);
  const [items, setItems] = useState<TicketCatalogOption[]>([]);
  const [clientId, setClientId] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [typeId, setTypeId] = useState('3');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('0');
  const [itemId, setItemId] = useState('0');
  const [levelId, setLevelId] = useState('1');
  const [priorityId, setPriorityId] = useState('1');
  const [formId, setFormId] = useState('1');
  const [technicianId, setTechnicianId] = useState('0');
  const [openingAt, setOpeningAt] = useState(localDateTime);
  const [description, setDescription] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurrenceAt, setRecurrenceAt] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState('2');
  const [remaining, setRemaining] = useState('1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTicketCreateCatalogs()
      .then((creation) => setCreateCatalogs(creation))
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
  }, []);

  async function changeClient(value: string) {
    setClientId(value);
    setRequesterId('');
    setLocationId('');
    setRequesters([]);
    setLocations([]);
    if (!value) return;
    try {
      const [nextRequesters, nextLocations] = await Promise.all([
        fetchTicketRequesters(Number(value)),
        fetchTicketLocations(Number(value)),
      ]);
      setRequesters(nextRequesters);
      setLocations(nextLocations);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  async function changeCategory(value: string) {
    setCategoryId(value);
    setSubcategoryId('0');
    setItemId('0');
    setSubcategories([]);
    setItems([]);
    if (!value) return;
    try {
      setSubcategories(await fetchTicketCreateSubcategories(Number(value)));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  async function changeSubcategory(value: string) {
    setSubcategoryId(value);
    setItemId('0');
    setItems([]);
    if (!value || value === '0') return;
    try {
      setItems(await fetchTicketCreateItems(Number(value)));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await createTicket({
        clientId: Number(clientId),
        requesterId: Number(requesterId),
        locationId: Number(locationId),
        typeId: Number(typeId),
        categoryId: Number(categoryId),
        subcategoryId: Number(subcategoryId),
        itemId: Number(itemId),
        levelId: Number(levelId),
        priorityId: Number(priorityId),
        formId: Number(formId),
        openingDescription: description,
        openingAt,
        technicianId: Number(technicianId),
        recurrence: recurring
          ? {
              recurrenceAt,
              rule: Number(recurrenceRule) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
              remaining: Number(remaining),
            }
          : null,
      });
      router.push(`/tickets/${response.id}`);
      router.refresh();
    } catch (reason) {
      setError(errorMessage(reason));
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-5 border-b border-app-border bg-[var(--app-header-bg)] px-6 py-3.5 backdrop-blur-xl max-sm:px-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <AppSidebar />
          <Link
            className="flex items-baseline gap-2.5 no-underline"
            href="/dashboard"
          >
            <strong className="text-lg text-app-text">Helpdesk</strong>
            <span className="text-[13px] text-app-subtle max-sm:hidden">
              Nova plataforma
            </span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-6 py-6 max-sm:px-3.5">
        <div className="mb-[18px] flex items-end justify-between gap-6 max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
          <div>
            <span className="mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">
              Operação
            </span>
            <h1 className="m-0 text-[28px] font-bold tracking-tight text-app-text">
              Novo atendimento
            </h1>
            <p className="mt-1.5 text-app-muted-strong">
              Registre uma solicitação imediata, agendada ou recorrente.
            </p>
          </div>
          <Link className={BUTTON_CLASS} href="/tickets">
            Voltar à lista
          </Link>
        </div>

        {error ? (
          <div
            className="mb-4 rounded-lg border border-app-danger-border bg-app-danger-soft px-4 py-3.5 text-sm text-app-danger"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        {loading ? (
          <div
            aria-label="Carregando"
            className="mb-3 h-1 overflow-hidden rounded-full bg-app-border"
            role="progressbar"
          >
            <div className="h-full w-1/3 animate-pulse rounded-full bg-app-brand" />
          </div>
        ) : null}

        <form
          className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10"
          onSubmit={submit}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className={FIELD_LABEL_CLASS}>
              Cliente
              <select
                className={FIELD_CONTROL_CLASS}
                disabled={saving}
                onChange={(event) => void changeClient(event.target.value)}
                required
                value={clientId}
              >
                <option value="">Selecione</option>
                <Options values={createCatalogs?.clients ?? []} />
              </select>
            </label>
            <label className={FIELD_LABEL_CLASS}>
              Solicitante
              <select
                className={FIELD_CONTROL_CLASS}
                disabled={saving || !clientId}
                onChange={(event) => setRequesterId(event.target.value)}
                required
                value={requesterId}
              >
                <option value="">Selecione</option>
                <Options values={requesters} />
              </select>
            </label>
            <label className={FIELD_LABEL_CLASS}>
              Local
              <select
                className={FIELD_CONTROL_CLASS}
                disabled={saving || !clientId}
                onChange={(event) => setLocationId(event.target.value)}
                required
                value={locationId}
              >
                <option value="">Selecione</option>
                <Options values={locations} />
              </select>
            </label>
            <label className={FIELD_LABEL_CLASS}>
              Tipo
              <select
                className={FIELD_CONTROL_CLASS}
                disabled={saving}
                onChange={(event) => setTypeId(event.target.value)}
                required
                value={typeId}
              >
                <Options values={createCatalogs?.types ?? []} />
              </select>
            </label>
            <label className={FIELD_LABEL_CLASS}>
              Categoria
              <select
                className={FIELD_CONTROL_CLASS}
                disabled={saving}
                onChange={(event) => void changeCategory(event.target.value)}
                required
                value={categoryId}
              >
                <option value="">Selecione</option>
                <Options values={createCatalogs?.categories ?? []} />
              </select>
            </label>
            <label className={FIELD_LABEL_CLASS}>
              Subcategoria
              <select
                className={FIELD_CONTROL_CLASS}
                disabled={saving || !categoryId}
                onChange={(event) => void changeSubcategory(event.target.value)}
                required
                value={subcategoryId}
              >
                <option value="0">Não informado</option>
                <Options values={subcategories.filter((option) => option.id > 0)} />
              </select>
            </label>
            <label className={FIELD_LABEL_CLASS}>
              Item
              <select
                className={FIELD_CONTROL_CLASS}
                disabled={saving || subcategoryId === '0'}
                onChange={(event) => setItemId(event.target.value)}
                required
                value={itemId}
              >
                <option value="0">Não informado</option>
                <Options values={items.filter((option) => option.id > 0)} />
              </select>
            </label>
            <label className={FIELD_LABEL_CLASS}>
              Nível
              <select
                className={FIELD_CONTROL_CLASS}
                disabled={saving}
                onChange={(event) => setLevelId(event.target.value)}
                required
                value={levelId}
              >
                <Options values={createCatalogs?.levels ?? []} />
              </select>
            </label>
            <label className={FIELD_LABEL_CLASS}>
              Prioridade
              <select
                className={FIELD_CONTROL_CLASS}
                disabled={saving}
                onChange={(event) => setPriorityId(event.target.value)}
                required
                value={priorityId}
              >
                <Options values={createCatalogs?.priorities ?? []} />
              </select>
            </label>
            <label className={FIELD_LABEL_CLASS}>
              Forma
              <select
                className={FIELD_CONTROL_CLASS}
                disabled={saving}
                onChange={(event) => setFormId(event.target.value)}
                required
                value={formId}
              >
                <Options values={createCatalogs?.forms ?? []} />
              </select>
            </label>
            <label className={FIELD_LABEL_CLASS}>
              Técnico
              <select
                className={FIELD_CONTROL_CLASS}
                disabled={saving}
                onChange={(event) => setTechnicianId(event.target.value)}
                required
                value={technicianId}
              >
                <Options values={createCatalogs?.technicians ?? []} />
              </select>
            </label>
            <label className={FIELD_LABEL_CLASS}>
              Abertura
              <input
                className={FIELD_CONTROL_CLASS}
                disabled={saving}
                onChange={(event) => setOpeningAt(event.target.value)}
                required
                type="datetime-local"
                value={openingAt}
              />
            </label>
            <label className={`${FIELD_LABEL_CLASS} sm:col-span-2 xl:col-span-3`}>
              Descrição de abertura
              <textarea
                className={TEXTAREA_CLASS}
                disabled={saving}
                maxLength={10000}
                onChange={(event) => setDescription(event.target.value)}
                required
                rows={5}
                value={description}
              />
            </label>
          </div>

          <fieldset className="mt-5 rounded-xl border border-app-border bg-app-surface-muted p-4">
            <legend className="px-1 text-sm font-extrabold text-app-text-soft">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  checked={recurring}
                  className="size-4 accent-[var(--app-brand)]"
                  disabled={saving}
                  onChange={(event) => setRecurring(event.target.checked)}
                  type="checkbox"
                />
                Atendimento recorrente
              </label>
            </legend>
            {recurring ? (
              <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 xl:grid-cols-3">
                <label className={FIELD_LABEL_CLASS}>
                  Primeira reabertura
                  <input
                    className={FIELD_CONTROL_CLASS}
                    disabled={saving}
                    onChange={(event) => setRecurrenceAt(event.target.value)}
                    required
                    type="datetime-local"
                    value={recurrenceAt}
                  />
                </label>
                <label className={FIELD_LABEL_CLASS}>
                  Periodicidade
                  <select
                    className={FIELD_CONTROL_CLASS}
                    disabled={saving}
                    onChange={(event) => setRecurrenceRule(event.target.value)}
                    value={recurrenceRule}
                  >
                    <Options values={createCatalogs?.recurrenceRules ?? []} />
                  </select>
                </label>
                <label className={FIELD_LABEL_CLASS}>
                  Quantidade
                  <input
                    className={FIELD_CONTROL_CLASS}
                    disabled={saving}
                    max={12}
                    min={1}
                    onChange={(event) => setRemaining(event.target.value)}
                    required
                    type="number"
                    value={remaining}
                  />
                </label>
              </div>
            ) : null}
          </fieldset>

          <div className="mt-5 flex justify-end max-sm:[&>*]:w-full">
            <button
              className={PRIMARY_BUTTON_CLASS}
              disabled={saving || loading}
              type="submit"
            >
              {saving ? 'Cadastrando…' : 'Cadastrar atendimento'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

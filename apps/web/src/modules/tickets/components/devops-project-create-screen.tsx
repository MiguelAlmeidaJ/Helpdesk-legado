"use client";

import type {
  CurrentUserResponse,
  TicketCatalogOption,
  TicketCreateCatalogsResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import {
  createDevOpsProject,
  fetchDevOpsCreateCatalogs,
  fetchDevOpsItems,
  fetchDevOpsLocations,
  fetchDevOpsRequesters,
  fetchDevOpsSubcategories,
  fetchTicketTypes,
} from '../api/modular-ticket-create-api';
const FORM_SURFACE_CLASS =
  'grid gap-5 rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm shadow-slate-950/5 dark:shadow-black/10 [&_label]:grid [&_label]:min-w-0 [&_label]:content-start [&_label]:gap-1.5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-app-text-soft [&_label_small]:text-xs [&_label_small]:font-normal [&_label_small]:text-app-muted [&_input]:min-h-10 [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-3 [&_input]:text-sm [&_input]:text-app-text [&_input]:outline-none [&_input]:transition [&_select]:min-h-10 [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-lg [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-3 [&_select]:text-sm [&_select]:text-app-text [&_select]:outline-none [&_select]:transition [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-app-border-strong [&_textarea]:bg-app-surface [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-sm [&_textarea]:text-app-text [&_textarea]:outline-none [&_textarea]:transition [&_input:focus]:border-app-brand [&_input:focus]:ring-3 [&_input:focus]:ring-[var(--app-brand-ring)] [&_select:focus]:border-app-brand [&_select:focus]:ring-3 [&_select:focus]:ring-[var(--app-brand-ring)] [&_textarea:focus]:border-app-brand [&_textarea:focus]:ring-3 [&_textarea:focus]:ring-[var(--app-brand-ring)] [&_input:disabled]:cursor-not-allowed [&_input:disabled]:opacity-55 [&_select:disabled]:cursor-not-allowed [&_select:disabled]:opacity-55 [&_textarea:disabled]:cursor-not-allowed [&_textarea:disabled]:opacity-55';

const styles = {
  typeGrid: 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3',
  typeCard:
    'group grid min-h-[190px] gap-3.5 rounded-2xl border border-app-border bg-app-surface p-5 text-app-text no-underline shadow-sm shadow-slate-950/5 transition hover:-translate-y-0.5 hover:border-app-border-strong hover:shadow-lg hover:shadow-slate-950/10 dark:shadow-black/10 dark:hover:shadow-black/20',
  typeTop: 'flex items-center justify-between gap-4',
  typeKey: 'text-lg font-bold text-app-text',
  arrow: 'text-[1.4rem] text-app-brand transition-transform group-hover:translate-x-1',
  capabilities: 'mt-auto flex flex-wrap gap-2',
  pill: 'rounded-full border border-app-border-strong bg-app-surface-muted px-2.5 py-1 text-xs font-semibold text-app-text-soft',
  sectionHeader: 'mb-4 flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start',
  card: FORM_SURFACE_CLASS,
  grid: 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3',
  fullWidth: 'md:col-span-2 xl:col-span-3',
  readonly: 'bg-app-surface-muted',
  error:
    'mb-4 rounded-xl border border-red-300/70 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200',
  success:
    'mb-4 rounded-xl border border-emerald-300/70 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200',
  emptyState:
    'mb-4 rounded-xl border border-app-border bg-app-surface px-4 py-5 text-center text-sm text-app-muted-strong',
  muted: 'm-0 text-sm text-app-muted',
  actions: 'flex flex-wrap justify-end gap-3 max-sm:[&>*]:w-full',
} as const;

function localDateTime(): string {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return now.toISOString().slice(0, 16);
}

function apiErrorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const message = (reason.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(' ');
  }
  if (reason instanceof ApiError) return `A API respondeu com erro ${reason.status}.`;
  return reason instanceof Error ? reason.message : 'Não foi possível concluir a operação.';
}

function Options({ values }: { values: TicketCatalogOption[] }) {
  return values.map((option) => (
    <option key={option.id} value={option.id}>{option.name}</option>
  ));
}

export function DevOpsProjectCreateScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [catalogs, setCatalogs] = useState<TicketCreateCatalogsResponse | null>(null);
  const [canCreate, setCanCreate] = useState<boolean | null>(null);
  const [requesters, setRequesters] = useState<TicketCatalogOption[]>([]);
  const [locations, setLocations] = useState<TicketCatalogOption[]>([]);
  const [subcategories, setSubcategories] = useState<TicketCatalogOption[]>([]);
  const [items, setItems] = useState<TicketCatalogOption[]>([]);
  const [clientId, setClientId] = useState('');
  const [requesterId, setRequesterId] = useState('0');
  const [locationId, setLocationId] = useState('0');
  const [typeId, setTypeId] = useState('3');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('0');
  const [itemId, setItemId] = useState('0');
  const [levelId, setLevelId] = useState('6');
  const [formId, setFormId] = useState('1');
  const [technicianId, setTechnicianId] = useState('0');
  const [openingAt, setOpeningAt] = useState(localDateTime);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    Promise.all([fetchDevOpsCreateCatalogs(), fetchTicketTypes()])
      .then(([nextCatalogs, typeResponse]) => {
        setCatalogs(nextCatalogs);
        const devops = typeResponse.ticketTypes.find((type) => type.key === 'devops');
        setCanCreate(Boolean(devops?.canCreate));
      })
      .catch((reason) => setError(apiErrorMessage(reason)))
      .finally(() => setLoading(false));
  }, []);

  async function changeClient(value: string) {
    setClientId(value);
    setRequesterId('0');
    setLocationId('0');
    setRequesters([]);
    setLocations([]);
    setError(null);
    const id = Number(value || 0);
    if (id <= 0) return;
    try {
      const [nextRequesters, nextLocations] = await Promise.all([
        fetchDevOpsRequesters(id),
        fetchDevOpsLocations(id),
      ]);
      setRequesters(nextRequesters);
      setLocations(nextLocations);
    } catch (reason) {
      setError(apiErrorMessage(reason));
    }
  }

  async function changeCategory(value: string) {
    setCategoryId(value);
    setSubcategoryId('0');
    setItemId('0');
    setSubcategories([]);
    setItems([]);
    setError(null);
    if (!value) return;
    try {
      setSubcategories(await fetchDevOpsSubcategories(Number(value)));
    } catch (reason) {
      setError(apiErrorMessage(reason));
    }
  }

  async function changeSubcategory(value: string) {
    setSubcategoryId(value);
    setItemId('0');
    setItems([]);
    setError(null);
    const id = Number(value || 0);
    if (id <= 0) return;
    try {
      setItems(await fetchDevOpsItems(id));
    } catch (reason) {
      setError(apiErrorMessage(reason));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await createDevOpsProject({
        name,
        clientId: Number(clientId),
        requesterId: Number(requesterId),
        locationId: Number(locationId),
        typeId: Number(typeId),
        categoryId: Number(categoryId),
        subcategoryId: Number(subcategoryId),
        itemId: Number(itemId),
        levelId: Number(levelId),
        formId: Number(formId),
        openingDescription: description,
        openingAt,
        technicianId: Number(technicianId),
      });
      setSuccess({ id: result.id, name });
      setName('');
      setDescription('');
    } catch (reason) {
      setError(apiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  const disabled = loading || saving || canCreate !== true;

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--app-brand-ring)]" href="/atendimentos/devops/projetos">
            Voltar aos projetos
          </Link>
        }
        subtitle="Crie um agrupador opcional para tarefas DevOps."
        title="Novo projeto"
        user={currentUser}
      />
      <div className="mx-auto w-full max-w-[1500px] px-6 py-6 max-sm:px-3.5">

        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        {canCreate === false ? <div className={styles.error} role="alert">Seu acesso DevOps permite leitura, mas não criação de projetos.</div> : null}
        {success ? <div className={styles.success} role="status">Projeto <Link href={`/atendimentos/devops/projetos/${success.id}`}>#{success.id} · {success.name}</Link> criado.</div> : null}
        {loading ? <div className="mb-3 h-[3px] animate-pulse rounded-full bg-app-brand" aria-label="Carregando" /> : null}

        <form className={styles.card} onSubmit={submit}>
          <div className={styles.grid}>
            <label className={styles.fullWidth}>
              <span>Nome do projeto</span>
              <input disabled={disabled} maxLength={255} onChange={(event) => setName(event.target.value)} required value={name} />
            </label>
            <label>
              <span>Cliente</span>
              <select disabled={disabled} onChange={(event) => void changeClient(event.target.value)} required value={clientId}>
                <option value="">Selecione</option><Options values={catalogs?.clients ?? []} />
              </select>
            </label>
            <label>
              <span>Solicitante</span>
              <select disabled={disabled || !clientId} onChange={(event) => setRequesterId(event.target.value)} value={requesterId}>
                <option value="0">Não informado</option><Options values={requesters} />
              </select>
            </label>
            <label>
              <span>Local</span>
              <select disabled={disabled || !clientId} onChange={(event) => setLocationId(event.target.value)} value={locationId}>
                <option value="0">Não informado</option><Options values={locations} />
              </select>
            </label>
            <label>
              <span>Tipo</span>
              <select disabled={disabled} onChange={(event) => setTypeId(event.target.value)} value={typeId}><Options values={catalogs?.types ?? []} /></select>
            </label>
            <label>
              <span>Categoria</span>
              <select disabled={disabled} onChange={(event) => void changeCategory(event.target.value)} required value={categoryId}>
                <option value="">Selecione</option><Options values={catalogs?.categories ?? []} />
              </select>
            </label>
            <label>
              <span>Subcategoria</span>
              <select disabled={disabled || !categoryId} onChange={(event) => void changeSubcategory(event.target.value)} value={subcategoryId}>
                <option value="0">Não informada</option><Options values={subcategories} />
              </select>
            </label>
            <label>
              <span>Item</span>
              <select disabled={disabled || !categoryId} onChange={(event) => setItemId(event.target.value)} value={itemId}>
                <option value="0">Não informado</option><Options values={items} />
              </select>
            </label>
            <label>
              <span>Nível</span>
              <select disabled={disabled} onChange={(event) => setLevelId(event.target.value)} value={levelId}><Options values={catalogs?.levels ?? []} /></select>
            </label>
            <label>
              <span>Forma</span>
              <select disabled={disabled} onChange={(event) => setFormId(event.target.value)} value={formId}><Options values={catalogs?.forms ?? []} /></select>
            </label>
            <label>
              <span>Técnico inicial</span>
              <select disabled={disabled} onChange={(event) => setTechnicianId(event.target.value)} value={technicianId}>
                <option value="0">Não atribuído</option><Options values={catalogs?.technicians ?? []} />
              </select>
            </label>
            <label>
              <span>Abertura</span>
              <input disabled={disabled} onChange={(event) => setOpeningAt(event.target.value)} required type="datetime-local" value={openingAt} />
            </label>
            <label className={styles.fullWidth}>
              <span>Descrição de abertura</span>
              <textarea disabled={disabled} maxLength={10000} onChange={(event) => setDescription(event.target.value)} required rows={5} value={description} />
            </label>
          </div>
          <p className={styles.muted}>As mesmas classificações de DevOps são usadas por projetos e tarefas. O cliente será herdado pelas tarefas criadas dentro deste projeto.</p>
          <div className={styles.actions}><button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-brand bg-app-brand px-4 font-bold text-white transition hover:bg-app-brand-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled} type="submit">{saving ? 'Criando…' : 'Criar projeto'}</button></div>
        </form>
      </div>
    </main>
  );
}

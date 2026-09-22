"use client";

import type {
  CurrentUserResponse,
  MarketingTicketCatalogsResponse,
  TicketCatalogOption,
  TicketCreateCatalogsResponse,
  TicketProjectListItem,
  TicketProjectTaskListItem,
  TicketTypeDescriptor,
  TicketTypeKey,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import {
  createDevOpsProjectTask,
  createMarketingTicket,
  createStandaloneDevOpsTicket,
  fetchDevOpsCreateCatalogs,
  fetchDevOpsItems,
  fetchDevOpsLocations,
  fetchDevOpsProjects,
  fetchDevOpsProjectTasks,
  fetchDevOpsRequesters,
  fetchDevOpsSubcategories,
  fetchMarketingCreateCatalogs,
  fetchMarketingLocations,
  fetchMarketingRequesters,
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

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const message = (reason.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(' ');
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

function ScreenShell({
  currentUser,
  title,
  subtitle,
  children,
  action,
}: {
  currentUser: CurrentUserResponse;
  title: string;
  subtitle: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          action ?? (
            <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--app-brand-ring)]" href="/atendimentos">
              Voltar à lista
            </Link>
          )
        }
        subtitle={subtitle}
        title={title}
        user={currentUser}
      />
      <div className="mx-auto w-full max-w-[1500px] px-6 py-6 max-sm:px-3.5">
        {children}
      </div>
    </main>
  );
}

function capabilityLabels(type: TicketTypeDescriptor): string[] {
  const labels: string[] = [];
  if (type.capabilities.sla) labels.push('SLA');
  if (type.capabilities.projects) labels.push('Projetos');
  if (type.capabilities.recurrence) labels.push('Recorrência');
  if (type.key === 'marketing') labels.push('Campos próprios');
  return labels;
}

function TypeChooser({ types }: { types: TicketTypeDescriptor[] }) {
  const available = types.filter((type) => type.canCreate);

  if (available.length === 0) {
    return (
      <div className={styles.emptyState}>
        Nenhum tipo de atendimento está disponível para criação com o seu acesso atual.
      </div>
    );
  }

  return (
    <div className={styles.typeGrid}>
      {available.map((type) => (
        <Link
          className={styles.typeCard}
          href={type.key === 'atendimento' ? '/atendimentos/novo' : `/atendimentos/${type.key}/nova-tarefa`}
          key={type.key}
        >
          <div className={styles.typeTop}>
            <span className={styles.typeKey}>{type.label}</span>
            <span aria-hidden="true" className={styles.arrow}>→</span>
          </div>
          <p>{type.description}</p>
          <div className={styles.capabilities}>
            {capabilityLabels(type).map((label) => (
              <span className={styles.pill} key={label}>{label}</span>
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
}

function FormHeader({ label, description }: { label: string; description: string }) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <span className="mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted">{label}</span>
        <h2>{description}</h2>
      </div>
    </div>
  );
}

function DevOpsTicketForm({ initialProjectId }: { initialProjectId?: number }) {
  const router = useRouter();
  const [catalogs, setCatalogs] = useState<TicketCreateCatalogsResponse | null>(null);
  const [projects, setProjects] = useState<TicketProjectListItem[]>([]);
  const [dependencies, setDependencies] = useState<TicketProjectTaskListItem[]>([]);
  const [requesters, setRequesters] = useState<TicketCatalogOption[]>([]);
  const [locations, setLocations] = useState<TicketCatalogOption[]>([]);
  const [subcategories, setSubcategories] = useState<TicketCatalogOption[]>([]);
  const [items, setItems] = useState<TicketCatalogOption[]>([]);
  const [projectId, setProjectId] = useState(String(initialProjectId ?? 0));
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
  const [days, setDays] = useState('0');
  const [dependencyTaskId, setDependencyTaskId] = useState('0');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(projectId)),
    [projectId, projects],
  );
  const effectiveClientId = selectedProject?.client.id ?? Number(clientId || 0);

  useEffect(() => {
    Promise.all([fetchDevOpsCreateCatalogs(), fetchDevOpsProjects()])
      .then(async ([nextCatalogs, projectResponse]) => {
        setCatalogs(nextCatalogs);
        setProjects(projectResponse.data);

        if (!initialProjectId) return;
        const initialProject = projectResponse.data.find(
          (project) => project.id === initialProjectId,
        );
        if (!initialProject) {
          setProjectId('0');
          setError('O projeto informado não está disponível no seu escopo.');
          return;
        }

        const client = initialProject.client.id ?? 0;
        const [nextRequesters, nextLocations, taskResponse] = await Promise.all([
          fetchDevOpsRequesters(client),
          fetchDevOpsLocations(client),
          fetchDevOpsProjectTasks(initialProject.id),
        ]);
        setRequesters(nextRequesters);
        setLocations(nextLocations);
        setDependencies(taskResponse.data);
      })
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
  }, [initialProjectId]);

  async function loadClientParties(nextClientId: number) {
    setRequesterId('0');
    setLocationId('0');
    setRequesters([]);
    setLocations([]);
    if (nextClientId <= 0) return;
    const [nextRequesters, nextLocations] = await Promise.all([
      fetchDevOpsRequesters(nextClientId),
      fetchDevOpsLocations(nextClientId),
    ]);
    setRequesters(nextRequesters);
    setLocations(nextLocations);
  }

  async function changeClient(value: string) {
    setClientId(value);
    setError(null);
    try {
      await loadClientParties(Number(value || 0));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  async function changeProject(value: string) {
    setProjectId(value);
    setDependencies([]);
    setDependencyTaskId('0');
    setError(null);
    const nextProject = projects.find((project) => project.id === Number(value));
    if (!nextProject) {
      setClientId('');
      setRequesterId('0');
      setLocationId('0');
      setRequesters([]);
      setLocations([]);
      return;
    }
    const nextClientId = nextProject.client.id ?? 0;
    try {
      const [, taskResponse] = await Promise.all([
        loadClientParties(nextClientId),
        fetchDevOpsProjectTasks(nextProject.id),
      ]);
      setDependencies(taskResponse.data);
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
    setError(null);
    if (!value) return;
    try {
      setSubcategories(await fetchDevOpsSubcategories(Number(value)));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  async function changeSubcategory(value: string) {
    setSubcategoryId(value);
    setItemId('0');
    setItems([]);
    setError(null);
    try {
      setItems(await fetchDevOpsItems(Number(value)));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (effectiveClientId <= 0) {
        throw new Error('Selecione um cliente ou projeto.');
      }

      const common = {
        name,
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
      };

      let createdId: number;
      if (selectedProject) {
        const result = await createDevOpsProjectTask(selectedProject.id, {
          ...common,
          days: Number(days),
          dependencyTaskId: Number(dependencyTaskId),
        });
        createdId = result.id;
      } else {
        const result = await createStandaloneDevOpsTicket({
          ...common,
          clientId: effectiveClientId,
        });
        createdId = result.id;
      }

      router.push(`/atendimentos/devops/${createdId}`);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error && !(reason instanceof ApiError)
          ? reason.message
          : errorMessage(reason),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <FormHeader
        description="Dados da tarefa"
        label="DevOps · sem SLA"
      />
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {loading ? <div className="mb-3 h-[3px] animate-pulse rounded-full bg-app-brand" aria-label="Carregando" /> : null}
      <form className={styles.card} onSubmit={submit}>
        <div className={styles.grid}>
          <label>
            <span>Projeto</span>
            <select
              disabled={saving || loading}
              onChange={(event) => void changeProject(event.target.value)}
              value={projectId}
            >
              <option value="0">Sem projeto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  #{project.id} · {project.name}
                </option>
              ))}
            </select>
            <small>Ao vincular a um projeto, o cliente é herdado e as dependências passam a controlar o início da tarefa.</small>
          </label>

          {selectedProject ? (
            <label>
              <span>Cliente</span>
              <input
                className={styles.readonly}
                readOnly
                value={selectedProject.client.name ?? `#${selectedProject.client.id ?? ''}`}
              />
            </label>
          ) : (
            <label>
              <span>Cliente</span>
              <select
                disabled={saving || loading}
                onChange={(event) => void changeClient(event.target.value)}
                required
                value={clientId}
              >
                <option value="">Selecione</option>
                <Options values={catalogs?.clients ?? []} />
              </select>
            </label>
          )}

          <label>
            <span>Solicitante</span>
            <select
              disabled={saving || effectiveClientId <= 0}
              onChange={(event) => setRequesterId(event.target.value)}
              value={requesterId}
            >
              <Options values={requesters} />
            </select>
          </label>
          <label>
            <span>Local</span>
            <select
              disabled={saving || effectiveClientId <= 0}
              onChange={(event) => setLocationId(event.target.value)}
              value={locationId}
            >
              <Options values={locations} />
            </select>
          </label>
          <label>
            <span>Tipo</span>
            <select disabled={saving} onChange={(event) => setTypeId(event.target.value)} value={typeId}>
              <Options values={catalogs?.types ?? []} />
            </select>
          </label>
          <label>
            <span>Categoria</span>
            <select
              disabled={saving}
              onChange={(event) => void changeCategory(event.target.value)}
              required
              value={categoryId}
            >
              <option value="">Selecione</option>
              <Options values={catalogs?.categories ?? []} />
            </select>
          </label>
          <label>
            <span>Subcategoria</span>
            <select
              disabled={saving || !categoryId}
              onChange={(event) => void changeSubcategory(event.target.value)}
              value={subcategoryId}
            >
              <Options values={subcategories} />
            </select>
          </label>
          <label>
            <span>Item</span>
            <select
              disabled={saving || !categoryId}
              onChange={(event) => setItemId(event.target.value)}
              value={itemId}
            >
              <Options values={items.length ? items : [{ id: 0, name: 'Não informado' }]} />
            </select>
          </label>
          <label>
            <span>Nível</span>
            <select disabled={saving} onChange={(event) => setLevelId(event.target.value)} value={levelId}>
              <Options values={catalogs?.levels ?? []} />
            </select>
          </label>
          <label>
            <span>Forma</span>
            <select disabled={saving} onChange={(event) => setFormId(event.target.value)} value={formId}>
              <Options values={catalogs?.forms ?? []} />
            </select>
          </label>
          <label>
            <span>Técnico</span>
            <select disabled={saving} onChange={(event) => setTechnicianId(event.target.value)} value={technicianId}>
              <Options values={catalogs?.technicians ?? []} />
            </select>
          </label>
          <label>
            <span>Abertura</span>
            <input
              disabled={saving}
              onChange={(event) => setOpeningAt(event.target.value)}
              required
              type="datetime-local"
              value={openingAt}
            />
          </label>

          {selectedProject ? (
            <>
              <label>
                <span>Dias</span>
                <input
                  disabled={saving}
                  max={3650}
                  min={0}
                  onChange={(event) => setDays(event.target.value)}
                  required
                  type="number"
                  value={days}
                />
              </label>
              <label>
                <span>Dependência</span>
                <select
                  disabled={saving}
                  onChange={(event) => setDependencyTaskId(event.target.value)}
                  value={dependencyTaskId}
                >
                  <option value="0">Sem dependência</option>
                  {dependencies.map((task) => (
                    <option key={task.id} value={task.id}>
                      #{task.id} · {task.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          <label className={styles.fullWidth}>
            <span>Nome da tarefa</span>
            <textarea
              disabled={saving}
              maxLength={255}
              onChange={(event) => setName(event.target.value)}
              required
              rows={2}
              value={name}
            />
          </label>
          <label className={styles.fullWidth}>
            <span>Descrição de abertura</span>
            <textarea
              disabled={saving}
              maxLength={10000}
              onChange={(event) => setDescription(event.target.value)}
              required
              rows={5}
              value={description}
            />
          </label>
        </div>
        <div className={styles.actions}>
          <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover" href="/atendimentos/devops">
            Cancelar
          </Link>
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-brand bg-app-brand px-4 font-bold text-white transition hover:bg-app-brand-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-50" disabled={saving || loading} type="submit">
            {saving ? 'Criando…' : 'Criar tarefa DevOps'}
          </button>
        </div>
      </form>
    </>
  );
}

function MarketingTicketForm() {
  const router = useRouter();
  const [catalogs, setCatalogs] = useState<MarketingTicketCatalogsResponse | null>(null);
  const [requesters, setRequesters] = useState<TicketCatalogOption[]>([]);
  const [locations, setLocations] = useState<TicketCatalogOption[]>([]);
  const [clientId, setClientId] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [formId, setFormId] = useState('1');
  const [technicianId, setTechnicianId] = useState('0');
  const [openingAt, setOpeningAt] = useState(localDateTime);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketingCreateCatalogs()
      .then((next) => {
        setCatalogs(next);
        setTypeId(String(next.types[0]?.id ?? ''));
        setCategoryId(String(next.categories[0]?.id ?? ''));
        setSubcategoryId(String(next.subcategories[0]?.id ?? ''));
        setLevelId(String(next.levels[0]?.id ?? ''));
      })
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
  }, []);

  async function changeClient(value: string) {
    setClientId(value);
    setRequesterId('');
    setLocationId('');
    setRequesters([]);
    setLocations([]);
    setError(null);
    if (!value) return;
    try {
      const [nextRequesters, nextLocations] = await Promise.all([
        fetchMarketingRequesters(Number(value)),
        fetchMarketingLocations(Number(value)),
      ]);
      setRequesters(nextRequesters);
      setLocations(nextLocations);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await createMarketingTicket({
        name,
        clientId: Number(clientId),
        requesterId: Number(requesterId),
        locationId: Number(locationId),
        typeId: Number(typeId),
        categoryId: Number(categoryId),
        subcategoryId: Number(subcategoryId),
        itemId: 0,
        levelId: Number(levelId),
        formId: Number(formId),
        openingDescription: description,
        openingAt,
        technicianId: Number(technicianId),
      });
      router.push(`/atendimentos/marketing/${result.id}`);
      router.refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <FormHeader
        description="Dados da tarefa"
        label="Marketing · sem SLA"
      />
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {loading ? <div className="mb-3 h-[3px] animate-pulse rounded-full bg-app-brand" aria-label="Carregando" /> : null}
      <form className={styles.card} onSubmit={submit}>
        <div className={styles.grid}>
          <label>
            <span>Cliente</span>
            <select
              disabled={saving || loading}
              onChange={(event) => void changeClient(event.target.value)}
              required
              value={clientId}
            >
              <option value="">Selecione</option>
              <Options values={catalogs?.clients ?? []} />
            </select>
          </label>
          <label>
            <span>Solicitante</span>
            <select
              disabled={saving || !clientId}
              onChange={(event) => setRequesterId(event.target.value)}
              required
              value={requesterId}
            >
              <option value="">Selecione</option>
              <Options values={requesters} />
            </select>
          </label>
          <label>
            <span>Local</span>
            <select
              disabled={saving || !clientId}
              onChange={(event) => setLocationId(event.target.value)}
              required
              value={locationId}
            >
              <option value="">Selecione</option>
              <Options values={locations} />
            </select>
          </label>
          <label>
            <span>Tipo de atendimento</span>
            <select disabled={saving} onChange={(event) => setTypeId(event.target.value)} required value={typeId}>
              <Options values={catalogs?.types ?? []} />
            </select>
          </label>
          <label>
            <span>Categoria</span>
            <select disabled={saving} onChange={(event) => setCategoryId(event.target.value)} required value={categoryId}>
              <Options values={catalogs?.categories ?? []} />
            </select>
          </label>
          <label>
            <span>Subcategoria</span>
            <select disabled={saving} onChange={(event) => setSubcategoryId(event.target.value)} required value={subcategoryId}>
              <Options values={catalogs?.subcategories ?? []} />
            </select>
          </label>
          <label>
            <span>Nível</span>
            <select disabled={saving} onChange={(event) => setLevelId(event.target.value)} required value={levelId}>
              <Options values={catalogs?.levels ?? []} />
            </select>
          </label>
          <label>
            <span>Forma</span>
            <select disabled={saving} onChange={(event) => setFormId(event.target.value)} required value={formId}>
              <Options values={catalogs?.forms ?? []} />
            </select>
          </label>
          <label>
            <span>Técnico</span>
            <select disabled={saving} onChange={(event) => setTechnicianId(event.target.value)} required value={technicianId}>
              <Options values={catalogs?.technicians ?? []} />
            </select>
          </label>
          <label>
            <span>Abertura</span>
            <input
              disabled={saving}
              onChange={(event) => setOpeningAt(event.target.value)}
              required
              type="datetime-local"
              value={openingAt}
            />
          </label>
          <label className={styles.fullWidth}>
            <span>Nome da tarefa</span>
            <textarea
              disabled={saving}
              maxLength={500}
              onChange={(event) => setName(event.target.value)}
              required
              rows={2}
              value={name}
            />
          </label>
          <label className={styles.fullWidth}>
            <span>Descrição de abertura</span>
            <textarea
              disabled={saving}
              maxLength={10000}
              onChange={(event) => setDescription(event.target.value)}
              required
              rows={5}
              value={description}
            />
          </label>
        </div>
        <p className={styles.muted}>
          Este formulário usa os catálogos próprios do terceiro andar. O campo
          Item não faz parte do cadastro atual de Marketing e permanece sem valor.
        </p>
        <div className={styles.actions}>
          <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover" href="/atendimentos/marketing">
            Cancelar
          </Link>
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-brand bg-app-brand px-4 font-bold text-white transition hover:bg-app-brand-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-50" disabled={saving || loading} type="submit">
            {saving ? 'Criando…' : 'Criar tarefa de Marketing'}
          </button>
        </div>
      </form>
    </>
  );
}

export function ModularTicketCreateScreen({
  currentUser,
  initialProjectId,
  initialType,
}: {
  currentUser: CurrentUserResponse;
  initialProjectId?: number;
  initialType?: Exclude<TicketTypeKey, 'atendimento'>;
}) {
  const [types, setTypes] = useState<TicketTypeDescriptor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTicketTypes()
      .then((response) => setTypes(response.ticketTypes))
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
  }, []);

  const selected = initialType
    ? types.find((type) => type.key === initialType)
    : undefined;
  const forbiddenSelection = Boolean(initialType && !loading && (!selected || !selected.canCreate));
  const screen =
    initialType === 'devops'
      ? {
          title: 'Nova tarefa DevOps',
          subtitle: 'Cadastre uma tarefa avulsa ou vinculada a um projeto.',
          backHref: '/atendimentos/devops',
          backLabel: 'Voltar às tarefas',
        }
      : initialType === 'marketing'
        ? {
            title: 'Nova tarefa de Marketing',
            subtitle: 'Registre uma nova demanda com os campos próprios do Marketing.',
            backHref: '/atendimentos/marketing',
            backLabel: 'Voltar às tarefas',
          }
        : {
            title: 'Novo atendimento',
            subtitle: 'Escolha o fluxo certo para o cadastro.',
            backHref: '/atendimentos',
            backLabel: 'Voltar à lista',
          };

  return (
    <ScreenShell
      action={<Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--app-brand-ring)]" href={screen.backHref}>{screen.backLabel}</Link>}
      currentUser={currentUser}
      subtitle={screen.subtitle}
      title={screen.title}
    >
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {loading ? <div className="mb-3 h-[3px] animate-pulse rounded-full bg-app-brand" aria-label="Carregando" /> : null}

      {forbiddenSelection ? (
        <div className={styles.error} role="alert">
          Você não possui permissão para criar este tipo de atendimento.
        </div>
      ) : null}

      {!initialType || forbiddenSelection ? <TypeChooser types={types} /> : null}
      {initialType === 'devops' && selected?.canCreate ? (
        <DevOpsTicketForm initialProjectId={initialProjectId} />
      ) : null}
      {initialType === 'marketing' && selected?.canCreate ? <MarketingTicketForm /> : null}
    </ScreenShell>
  );
}

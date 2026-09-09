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
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
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
import styles from './modular-ticket-create-screen.module.css';

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
    <main className="tickets-page">
      <header className="tickets-header">
        <div className="tickets-header-left">
          <AppSidebar />
          <Link className="tickets-brand" href="/dashboard">
            <strong>Helpdesk</strong>
            <span>Nova plataforma</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>
      <div className="tickets-content">
        <div className="tickets-title-row">
          <div>
            <span className="eyebrow">Tickets</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {action ?? <Link className="button" href="/tickets">Voltar à lista</Link>}
        </div>
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
        Nenhum tipo de ticket está disponível para criação com o seu acesso atual.
      </div>
    );
  }

  return (
    <div className={styles.typeGrid}>
      {available.map((type) => (
        <Link
          className={styles.typeCard}
          href={`/tickets/new?type=${type.key}`}
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
        <span className="eyebrow">{label}</span>
        <h2>{description}</h2>
      </div>
      <Link className="button" href="/tickets/new">Trocar tipo</Link>
    </div>
  );
}

function DevOpsTicketForm() {
  const [catalogs, setCatalogs] = useState<TicketCreateCatalogsResponse | null>(null);
  const [projects, setProjects] = useState<TicketProjectListItem[]>([]);
  const [dependencies, setDependencies] = useState<TicketProjectTaskListItem[]>([]);
  const [requesters, setRequesters] = useState<TicketCatalogOption[]>([]);
  const [locations, setLocations] = useState<TicketCatalogOption[]>([]);
  const [subcategories, setSubcategories] = useState<TicketCatalogOption[]>([]);
  const [items, setItems] = useState<TicketCatalogOption[]>([]);
  const [projectId, setProjectId] = useState('0');
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
  const [success, setSuccess] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === Number(projectId)),
    [projectId, projects],
  );
  const effectiveClientId = selectedProject?.client.id ?? Number(clientId || 0);

  useEffect(() => {
    Promise.all([fetchDevOpsCreateCatalogs(), fetchDevOpsProjects()])
      .then(([nextCatalogs, projectResponse]) => {
        setCatalogs(nextCatalogs);
        setProjects(projectResponse.data);
      })
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
  }, []);

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
    setSuccess(null);

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

      if (selectedProject) {
        const result = await createDevOpsProjectTask(selectedProject.id, {
          ...common,
          days: Number(days),
          dependencyTaskId: Number(dependencyTaskId),
        });
        setSuccess(
          `Ticket DevOps #${result.id} criado no projeto ${selectedProject.name}.`,
        );
      } else {
        const result = await createStandaloneDevOpsTicket({
          ...common,
          clientId: effectiveClientId,
        });
        setSuccess(`Ticket DevOps #${result.id} criado sem projeto.`);
      }

      setName('');
      setDescription('');
      setDependencyTaskId('0');
      setDays('0');
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
        description="Nova tarefa DevOps"
        label="DevOps · sem SLA"
      />
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {success ? <div className={styles.success} role="status">{success}</div> : null}
      {loading ? <div className="loading-line" aria-label="Carregando" /> : null}
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
            <small>Projeto é opcional e funciona apenas como agrupador.</small>
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
          <button className="button button-primary" disabled={saving || loading} type="submit">
            {saving ? 'Cadastrando…' : 'Cadastrar ticket DevOps'}
          </button>
        </div>
      </form>
    </>
  );
}

function MarketingTicketForm() {
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
  const [success, setSuccess] = useState<string | null>(null);

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
    setSuccess(null);
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
      setSuccess(`Ticket Marketing #${result.id} criado.`);
      setName('');
      setDescription('');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <FormHeader
        description="Nova tarefa de Marketing"
        label="Marketing · sem SLA"
      />
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {success ? <div className={styles.success} role="status">{success}</div> : null}
      {loading ? <div className="loading-line" aria-label="Carregando" /> : null}
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
          <button className="button button-primary" disabled={saving || loading} type="submit">
            {saving ? 'Cadastrando…' : 'Cadastrar ticket Marketing'}
          </button>
        </div>
      </form>
    </>
  );
}

export function ModularTicketCreateScreen({
  currentUser,
  initialType,
}: {
  currentUser: CurrentUserResponse;
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

  return (
    <ScreenShell
      action={<Link className="button" href="/tickets">Voltar à lista</Link>}
      currentUser={currentUser}
      subtitle="Escolha o fluxo certo. Cada tipo mantém seus campos, regras e permissões."
      title="Novo ticket"
    >
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {loading ? <div className="loading-line" aria-label="Carregando" /> : null}

      {forbiddenSelection ? (
        <div className={styles.error} role="alert">
          Você não possui permissão para criar este tipo de ticket.
        </div>
      ) : null}

      {!initialType || forbiddenSelection ? <TypeChooser types={types} /> : null}
      {initialType === 'devops' && selected?.canCreate ? <DevOpsTicketForm /> : null}
      {initialType === 'marketing' && selected?.canCreate ? <MarketingTicketForm /> : null}
    </ScreenShell>
  );
}

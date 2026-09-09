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
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import {
  createDevOpsProject,
  fetchDevOpsCreateCatalogs,
  fetchDevOpsItems,
  fetchDevOpsLocations,
  fetchDevOpsRequesters,
  fetchDevOpsSubcategories,
  fetchTicketTypes,
} from '../api/modular-ticket-create-api';
import styles from './modular-ticket-create-screen.module.css';

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
    <main className="tickets-page">
      <header className="tickets-header">
        <div className="tickets-header-left">
          <AppSidebar />
          <Link className="tickets-brand" href="/dashboard"><strong>Helpdesk</strong><span>Nova plataforma</span></Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>
      <div className="tickets-content">
        <div className="tickets-title-row">
          <div><span className="eyebrow">DevOps · Agrupamento</span><h1>Novo projeto</h1><p>Crie um agrupador opcional para tickets DevOps. Projeto não é um tipo de ticket.</p></div>
          <Link className="button" href="/tickets/devops/projects">Voltar aos projetos</Link>
        </div>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        {canCreate === false ? <div className={styles.error} role="alert">Seu acesso DevOps permite leitura, mas não criação de projetos.</div> : null}
        {success ? <div className={styles.success} role="status">Projeto <Link href={`/tickets/devops/projects/${success.id}`}>#{success.id} · {success.name}</Link> criado.</div> : null}
        {loading ? <div className="loading-line" aria-label="Carregando" /> : null}

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
          <div className={styles.actions}><button className="button button-primary" disabled={disabled} type="submit">{saving ? 'Criando…' : 'Criar projeto'}</button></div>
        </form>
      </div>
    </main>
  );
}

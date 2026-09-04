"use client";

import type { CurrentUserResponse, TicketCatalogOption, TicketCreateCatalogsResponse } from '@helpdesk/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { createTicket, fetchTicketCreateCatalogs, fetchTicketCreateItems, fetchTicketCreateSubcategories, fetchTicketLocations, fetchTicketRequesters } from '../api/tickets-api';
import styles from './ticket-create-screen.module.css';

function localDateTime(): string {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return now.toISOString().slice(0, 16);
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const message = (reason.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  return reason instanceof ApiError ? `A API respondeu com erro ${reason.status}.` : 'Não foi possível concluir a operação.';
}

function Options({ values }: { values: TicketCatalogOption[] }) {
  return values.map((option) => <option key={option.id} value={option.id}>{option.name}</option>);
}

export function TicketCreateScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const router = useRouter();
  const [createCatalogs, setCreateCatalogs] = useState<TicketCreateCatalogsResponse | null>(null);
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
    setClientId(value); setRequesterId(''); setLocationId(''); setRequesters([]); setLocations([]);
    if (!value) return;
    try { const [nextRequesters, nextLocations] = await Promise.all([fetchTicketRequesters(Number(value)), fetchTicketLocations(Number(value))]); setRequesters(nextRequesters); setLocations(nextLocations); }
    catch (reason) { setError(errorMessage(reason)); }
  }

  async function changeCategory(value: string) {
    setCategoryId(value); setSubcategoryId('0'); setItemId('0'); setSubcategories([]); setItems([]);
    if (!value) return;
    try { setSubcategories(await fetchTicketCreateSubcategories(Number(value))); }
    catch (reason) { setError(errorMessage(reason)); }
  }

  async function changeSubcategory(value: string) {
    setSubcategoryId(value); setItemId('0'); setItems([]);
    if (!value || value === '0') return;
    try { setItems(await fetchTicketCreateItems(Number(value))); }
    catch (reason) { setError(errorMessage(reason)); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const response = await createTicket({
        clientId: Number(clientId), requesterId: Number(requesterId), locationId: Number(locationId),
        typeId: Number(typeId), categoryId: Number(categoryId), subcategoryId: Number(subcategoryId), itemId: Number(itemId),
        levelId: Number(levelId), priorityId: Number(priorityId), formId: Number(formId), openingDescription: description,
        openingAt, technicianId: Number(technicianId),
        recurrence: recurring ? { recurrenceAt, rule: Number(recurrenceRule) as 1 | 2 | 3 | 4 | 5 | 6 | 7, remaining: Number(remaining) } : null,
      });
      router.push(`/tickets/${response.id}`); router.refresh();
    } catch (reason) { setError(errorMessage(reason)); setSaving(false); }
  }

  return (
    <main className="tickets-page">
      <header className="tickets-header"><div className="tickets-header-left"><AppSidebar /><Link className="tickets-brand" href="/dashboard"><strong>Helpdesk</strong><span>Nova plataforma</span></Link></div><SessionUserMenu user={currentUser} /></header>
      <div className="tickets-content">
        <div className="tickets-title-row"><div><span className="eyebrow">Operação</span><h1>Novo atendimento</h1><p>Registre uma solicitação imediata, agendada ou recorrente.</p></div><Link className="button" href="/tickets">Voltar à lista</Link></div>
        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        {loading ? <div className="loading-line" aria-label="Carregando" /> : null}
        <form className={styles.card} onSubmit={submit}>
          <div className={styles.grid}>
            <label><span>Cliente</span><select disabled={saving} onChange={(event) => void changeClient(event.target.value)} required value={clientId}><option value="">Selecione</option><Options values={createCatalogs?.clients ?? []} /></select></label>
            <label><span>Solicitante</span><select disabled={saving || !clientId} onChange={(event) => setRequesterId(event.target.value)} required value={requesterId}><option value="">Selecione</option><Options values={requesters} /></select></label>
            <label><span>Local</span><select disabled={saving || !clientId} onChange={(event) => setLocationId(event.target.value)} required value={locationId}><option value="">Selecione</option><Options values={locations} /></select></label>
            <label><span>Tipo</span><select disabled={saving} onChange={(event) => setTypeId(event.target.value)} required value={typeId}><Options values={createCatalogs?.types ?? []} /></select></label>
            <label><span>Categoria</span><select disabled={saving} onChange={(event) => void changeCategory(event.target.value)} required value={categoryId}><option value="">Selecione</option><Options values={createCatalogs?.categories ?? []} /></select></label>
            <label><span>Subcategoria</span><select disabled={saving || !categoryId} onChange={(event) => void changeSubcategory(event.target.value)} required value={subcategoryId}><option value="0">Não informado</option><Options values={subcategories.filter((option) => option.id > 0)} /></select></label>
            <label><span>Item</span><select disabled={saving || subcategoryId === '0'} onChange={(event) => setItemId(event.target.value)} required value={itemId}><option value="0">Não informado</option><Options values={items.filter((option) => option.id > 0)} /></select></label>
            <label><span>Nível</span><select disabled={saving} onChange={(event) => setLevelId(event.target.value)} required value={levelId}><Options values={createCatalogs?.levels ?? []} /></select></label>
            <label><span>Prioridade</span><select disabled={saving} onChange={(event) => setPriorityId(event.target.value)} required value={priorityId}><Options values={createCatalogs?.priorities ?? []} /></select></label>
            <label><span>Forma</span><select disabled={saving} onChange={(event) => setFormId(event.target.value)} required value={formId}><Options values={createCatalogs?.forms ?? []} /></select></label>
            <label><span>Técnico</span><select disabled={saving} onChange={(event) => setTechnicianId(event.target.value)} required value={technicianId}><Options values={createCatalogs?.technicians ?? []} /></select></label>
            <label><span>Abertura</span><input disabled={saving} onChange={(event) => setOpeningAt(event.target.value)} required type="datetime-local" value={openingAt} /></label>
            <label className={styles.description}><span>Descrição de abertura</span><textarea disabled={saving} maxLength={10000} onChange={(event) => setDescription(event.target.value)} required rows={5} value={description} /></label>
          </div>
          <fieldset className={styles.recurrence}><legend><label><input checked={recurring} disabled={saving} onChange={(event) => setRecurring(event.target.checked)} type="checkbox" /> Atendimento recorrente</label></legend>
            {recurring ? <div className={styles.grid}><label><span>Primeira reabertura</span><input disabled={saving} onChange={(event) => setRecurrenceAt(event.target.value)} required type="datetime-local" value={recurrenceAt} /></label><label><span>Periodicidade</span><select disabled={saving} onChange={(event) => setRecurrenceRule(event.target.value)} value={recurrenceRule}><Options values={createCatalogs?.recurrenceRules ?? []} /></select></label><label><span>Quantidade</span><input disabled={saving} max={12} min={1} onChange={(event) => setRemaining(event.target.value)} required type="number" value={remaining} /></label></div> : null}
          </fieldset>
          <div className={styles.actions}><button className="button button-primary" disabled={saving || loading} type="submit">{saving ? 'Cadastrando…' : 'Cadastrar atendimento'}</button></div>
        </form>
      </div>
    </main>
  );
}

"use client";

import type {
  ClientContactRecord,
  ClientContactWriteInput,
  ClientLocationRecord,
  ClientLocationWriteInput,
  ClientRelationsResponse,
} from '@helpdesk/contracts';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import {
  createClientContact,
  createClientLocation,
  fetchClientRelations,
  updateClientContact,
  updateClientLocation,
} from '../api/registrations-api';

const BUTTON =
  'inline-flex min-h-9 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface px-3 text-xs font-bold text-app-text-soft transition hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY = `${BUTTON} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;
const INPUT =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const message = (reason.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(' ');
  }
  return reason instanceof Error ? reason.message : 'Não foi possível concluir a operação.';
}

const EMPTY_CONTACT: ClientContactWriteInput = {
  name: '',
  role: '',
  email: '',
  phone: '',
  status: 1,
};

const EMPTY_LOCATION: ClientLocationWriteInput = {
  name: '',
  address: '',
  city: '',
  state: 'MG',
  status: 1,
};

export function ClientRelationsPanel({ clientId }: { clientId: number }) {
  const [data, setData] = useState<ClientRelationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [contactOpen, setContactOpen] = useState(false);
  const [contactEditing, setContactEditing] = useState<ClientContactRecord | null>(null);
  const [contact, setContact] = useState<ClientContactWriteInput>(EMPTY_CONTACT);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationEditing, setLocationEditing] = useState<ClientLocationRecord | null>(null);
  const [location, setLocation] = useState<ClientLocationWriteInput>(EMPTY_LOCATION);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchClientRelations(clientId, signal));
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function newContact() {
    setContactEditing(null);
    setContact(EMPTY_CONTACT);
    setContactOpen(true);
  }

  function editContact(record: ClientContactRecord) {
    setContactEditing(record);
    setContact({
      name: record.name,
      role: record.role,
      email: record.email,
      phone: record.phone,
      status: record.status,
    });
    setContactOpen(true);
  }

  function newLocation() {
    setLocationEditing(null);
    setLocation(EMPTY_LOCATION);
    setLocationOpen(true);
  }

  function editLocation(record: ClientLocationRecord) {
    setLocationEditing(record);
    setLocation({
      name: record.name,
      address: record.address,
      city: record.city,
      state: record.state || 'MG',
      status: record.status,
    });
    setLocationOpen(true);
  }

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (contactEditing) {
        await updateClientContact(clientId, contactEditing.id, contact);
      } else {
        await createClientContact(clientId, contact);
      }
      setContactOpen(false);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (locationEditing) {
        await updateClientLocation(clientId, locationEditing.id, location);
      } else {
        await createClientLocation(clientId, location);
      }
      setLocationOpen(false);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 border-t border-app-border-soft pt-5">
      <div className="mb-4">
        <h3 className="m-0 text-base font-bold text-app-text">Dados relacionados do cliente</h3>
        <p className="m-0 mt-1 text-xs text-app-muted">
          Contatos e locais usados na abertura e no acompanhamento dos atendimentos.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-app-danger-border bg-app-danger-soft px-3 py-2 text-xs text-app-danger">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="rounded-xl border border-app-border bg-app-surface-muted p-4 text-sm text-app-muted">
          Carregando contatos e locais…
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-app-border bg-app-surface-muted p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <strong className="text-sm">Contatos</strong>
                <p className="m-0 mt-0.5 text-xs text-app-muted">{data.contacts.length} cadastrado(s)</p>
              </div>
              {data.canCreateContacts ? (
                <button className={PRIMARY} onClick={newContact} type="button">Novo contato</button>
              ) : null}
            </div>

            {contactOpen ? (
              <form className="mb-3 grid gap-3 rounded-lg border border-app-border bg-app-surface p-3 sm:grid-cols-2" onSubmit={saveContact}>
                <label className="grid gap-1 text-xs font-semibold">
                  Nome
                  <input className={INPUT} maxLength={60} onChange={(event) => setContact({ ...contact, name: event.target.value })} required value={contact.name} />
                </label>
                <label className="grid gap-1 text-xs font-semibold">
                  Cargo
                  <input className={INPUT} maxLength={60} onChange={(event) => setContact({ ...contact, role: event.target.value })} required value={contact.role} />
                </label>
                <label className="grid gap-1 text-xs font-semibold">
                  E-mail
                  <input className={INPUT} maxLength={60} onChange={(event) => setContact({ ...contact, email: event.target.value })} required type="email" value={contact.email} />
                </label>
                <label className="grid gap-1 text-xs font-semibold">
                  Telefone
                  <input className={INPUT} maxLength={50} onChange={(event) => setContact({ ...contact, phone: event.target.value })} required value={contact.phone} />
                </label>
                <label className="grid gap-1 text-xs font-semibold">
                  Situação
                  <select className={INPUT} onChange={(event) => setContact({ ...contact, status: event.target.value === '1' ? 1 : 0 })} value={contact.status}>
                    <option value="1">Ativo</option>
                    <option value="0">Inativo</option>
                  </select>
                </label>
                <div className="flex items-end justify-end gap-2 sm:col-span-2">
                  <button className={BUTTON} onClick={() => setContactOpen(false)} type="button">Cancelar</button>
                  <button className={PRIMARY} disabled={saving} type="submit">{saving ? 'Salvando…' : 'Salvar contato'}</button>
                </div>
              </form>
            ) : null}

            <div className="grid gap-2">
              {data.contacts.map((record) => (
                <div className="flex items-start justify-between gap-3 rounded-lg border border-app-border bg-app-surface px-3 py-2.5" key={record.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm">{record.name}</strong>
                      <span className={record.status === 1 ? 'text-[10px] font-black uppercase text-app-success' : 'text-[10px] font-black uppercase text-app-muted'}>
                        {record.status === 1 ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="m-0 mt-1 truncate text-xs text-app-muted">{record.role} · {record.email} · {record.phone}</p>
                  </div>
                  {data.canEditContacts ? <button className={BUTTON} onClick={() => editContact(record)} type="button">Editar</button> : null}
                </div>
              ))}
              {!data.contacts.length ? <p className="m-0 text-xs text-app-muted">Nenhum contato cadastrado.</p> : null}
            </div>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface-muted p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <strong className="text-sm">Locais de atendimento</strong>
                <p className="m-0 mt-0.5 text-xs text-app-muted">{data.locations.length} cadastrado(s)</p>
              </div>
              {data.canCreateLocations ? (
                <button className={PRIMARY} onClick={newLocation} type="button">Novo local</button>
              ) : null}
            </div>

            {locationOpen ? (
              <form className="mb-3 grid gap-3 rounded-lg border border-app-border bg-app-surface p-3 sm:grid-cols-2" onSubmit={saveLocation}>
                <label className="grid gap-1 text-xs font-semibold">
                  Nome
                  <input className={INPUT} maxLength={60} onChange={(event) => setLocation({ ...location, name: event.target.value })} required value={location.name} />
                </label>
                <label className="grid gap-1 text-xs font-semibold">
                  Cidade
                  <input className={INPUT} maxLength={50} onChange={(event) => setLocation({ ...location, city: event.target.value })} required value={location.city} />
                </label>
                <label className="grid gap-1 text-xs font-semibold sm:col-span-2">
                  Endereço
                  <input className={INPUT} maxLength={100} onChange={(event) => setLocation({ ...location, address: event.target.value })} required value={location.address} />
                </label>
                <label className="grid gap-1 text-xs font-semibold">
                  UF
                  <input className={INPUT} maxLength={2} onChange={(event) => setLocation({ ...location, state: event.target.value.toUpperCase() })} required value={location.state} />
                </label>
                <label className="grid gap-1 text-xs font-semibold">
                  Situação
                  <select className={INPUT} onChange={(event) => setLocation({ ...location, status: event.target.value === '1' ? 1 : 0 })} value={location.status}>
                    <option value="1">Ativo</option>
                    <option value="0">Inativo</option>
                  </select>
                </label>
                <div className="flex items-end justify-end gap-2 sm:col-span-2">
                  <button className={BUTTON} onClick={() => setLocationOpen(false)} type="button">Cancelar</button>
                  <button className={PRIMARY} disabled={saving} type="submit">{saving ? 'Salvando…' : 'Salvar local'}</button>
                </div>
              </form>
            ) : null}

            <div className="grid gap-2">
              {data.locations.map((record) => (
                <div className="flex items-start justify-between gap-3 rounded-lg border border-app-border bg-app-surface px-3 py-2.5" key={record.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm">{record.name}</strong>
                      <span className={record.status === 1 ? 'text-[10px] font-black uppercase text-app-success' : 'text-[10px] font-black uppercase text-app-muted'}>
                        {record.status === 1 ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="m-0 mt-1 truncate text-xs text-app-muted">{record.address} · {record.city}/{record.state}</p>
                  </div>
                  {data.canEditLocations ? <button className={BUTTON} onClick={() => editLocation(record)} type="button">Editar</button> : null}
                </div>
              ))}
              {!data.locations.length ? <p className="m-0 text-xs text-app-muted">Nenhum local cadastrado.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

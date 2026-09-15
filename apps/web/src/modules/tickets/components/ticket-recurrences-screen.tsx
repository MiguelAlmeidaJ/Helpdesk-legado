'use client';

import {
  AppPermission,
  type CurrentUserResponse,
  type TicketRecurrenceItem,
  type TicketRecurrenceMutationRequest,
  type TicketRecurrenceQuantityMode,
  type TicketRecurrenceStatusFilter,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import {
  createTicketRecurrence,
  fetchTicketRecurrences,
  setTicketRecurrenceActive,
  updateTicketRecurrence,
} from '../api/ticket-recurrences-api';
import styles from './ticket-recurrences-screen.module.css';

function hasPermission(user: CurrentUserResponse, permission: AppPermission): boolean {
  return user.grants.some((grant) => grant.permission === AppPermission.SystemAdmin || grant.permission === permission);
}

interface Draft {
  name: string;
  clientId: string;
  period: string;
  nextAt: string;
  quantityMode: TicketRecurrenceQuantityMode;
  quantity: string;
}

const EMPTY_DRAFT: Draft = { name: '', clientId: '', period: '2', nextAt: '', quantityMode: 'fixa', quantity: '1' };

function draftFrom(item: TicketRecurrenceItem): Draft {
  return {
    name: item.name,
    clientId: String(item.clientId),
    period: String(item.period),
    nextAt: item.nextAt,
    quantityMode: item.quantityMode,
    quantity: String(item.quantityTotal ?? 1),
  };
}

function toInput(draft: Draft): TicketRecurrenceMutationRequest {
  return {
    name: draft.name.trim(),
    clientId: Number(draft.clientId),
    period: Number(draft.period) as TicketRecurrenceMutationRequest['period'],
    nextAt: draft.nextAt,
    quantityMode: draft.quantityMode,
    quantity: draft.quantityMode === 'fixa' ? Number(draft.quantity) : null,
  };
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError) return reason.message || 'Não foi possível concluir a operação.';
  return 'Não foi possível concluir a operação.';
}

export function TicketRecurrencesScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const canRead = hasPermission(currentUser, AppPermission.TicketsRead);
  const canCreate = hasPermission(currentUser, AppPermission.TicketsCreate);
  const canEdit = hasPermission(currentUser, AppPermission.TicketsEdit);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchTicketRecurrences>> | null>(null);
  const [status, setStatus] = useState<TicketRecurrenceStatusFilter>('ativas');
  const [clientId, setClientId] = useState('');
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(canRead);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const filters = useMemo(() => ({
    clientId: clientId ? Number(clientId) : undefined,
    period: period ? Number(period) : undefined,
    status,
  }), [clientId, period, status]);

  const load = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    setError(null);
    try { setData(await fetchTicketRecurrences(filters)); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setLoading(false); }
  }, [canRead, filters]);

  useEffect(() => { void load(); }, [load]);

  function startCreate() {
    setEditingId(0);
    setDraft({ ...EMPTY_DRAFT, clientId: clientId || String(data?.clients[0]?.id ?? '') });
    setNotice(null);
  }

  function startEdit(item: TicketRecurrenceItem) {
    setEditingId(item.id);
    setDraft(draftFrom(item));
    setNotice(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (editingId === null) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const input = toInput(draft);
      if (editingId === 0) {
        await createTicketRecurrence(input);
        setNotice('Recorrência cadastrada com sucesso.');
      } else {
        await updateTicketRecurrence(editingId, input);
        setNotice('Recorrência atualizada com sucesso.');
      }
      setEditingId(null);
      await load();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setSaving(false); }
  }

  async function toggle(item: TicketRecurrenceItem) {
    setSaving(true); setError(null); setNotice(null);
    try {
      await setTicketRecurrenceActive(item.id, !item.active);
      setNotice(item.active ? 'Recorrência desativada.' : 'Recorrência ativada.');
      await load();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setSaving(false); }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <AppSidebar />
          <Link className={styles.brand} href="/dashboard"><strong>Helpdesk</strong><span>Nova plataforma</span></Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <div><span className={styles.eyebrow}>Atendimentos</span><h1>Recorrências</h1><p>Gerencie atendimentos que se repetem automaticamente.</p></div>
          {canCreate ? <button className={styles.primary} type="button" onClick={startCreate}>Nova recorrência</button> : null}
        </div>

        {!canRead ? <div className={styles.notice}>Seu usuário não possui acesso às recorrências.</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {notice ? <div className={styles.success}>{notice}</div> : null}

        {canRead ? <section className={styles.card}>
          <div className={styles.filters}>
            <label>Cliente<select value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">Todos os clientes</option>{data?.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label>Período<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="">Todos os períodos</option>{data?.periods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as TicketRecurrenceStatusFilter)}><option value="ativas">Ativas</option><option value="inativas">Inativas</option><option value="todos">Todas</option></select></label>
            <button type="button" onClick={() => void load()} disabled={loading}>Atualizar</button>
          </div>
        </section> : null}

        {editingId !== null ? <section className={styles.card}>
          <div className={styles.cardHeader}><h2>{editingId === 0 ? 'Nova recorrência' : 'Editar recorrência'}</h2><button type="button" onClick={() => setEditingId(null)}>Fechar</button></div>
          <form className={styles.form} onSubmit={(event) => void save(event)}>
            <label>Nome<input required maxLength={180} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label>Cliente<select required value={draft.clientId} onChange={(event) => setDraft({ ...draft, clientId: event.target.value })}><option value="">Selecione</option>{data?.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label>Período<select value={draft.period} onChange={(event) => setDraft({ ...draft, period: event.target.value })}>{data?.periods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Próxima reabertura<input required type="datetime-local" value={draft.nextAt} onChange={(event) => setDraft({ ...draft, nextAt: event.target.value })} /></label>
            <label>Quantidade<select value={draft.quantityMode} onChange={(event) => setDraft({ ...draft, quantityMode: event.target.value as TicketRecurrenceQuantityMode })}><option value="fixa">Quantidade fixa</option><option value="continua">Enquanto estiver ativa</option></select></label>
            {draft.quantityMode === 'fixa' ? <label>Repetições<input required type="number" min={1} max={31} value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} /></label> : null}
            <div className={styles.formActions}><button type="button" onClick={() => setEditingId(null)}>Cancelar</button><button className={styles.primary} disabled={saving} type="submit">{saving ? 'Salvando…' : 'Salvar'}</button></div>
          </form>
        </section> : null}

        {canRead ? <section className={styles.card}>
          <div className={styles.cardHeader}><h2>Recorrências</h2><span>{data?.total ?? 0}</span></div>
          {loading ? <p className={styles.empty}>Carregando recorrências…</p> : data?.data.length ? <div className={styles.tableWrap}><table><thead><tr><th>Nome</th><th>Cliente</th><th>Período</th><th>Próxima reabertura</th><th>Quantidade</th><th>Status</th><th>Ações</th></tr></thead><tbody>{data.data.map((item) => <tr key={item.id}>
            <td><strong>{item.name}</strong><Link href={`/tickets/${item.modelTicketId}`}>Chamado modelo #{item.modelTicketId}</Link></td>
            <td>{item.clientName}</td><td>{item.periodLabel}</td><td>{item.nextAt.replace('T', ' ')}</td>
            <td>{item.quantityMode === 'continua' ? 'Contínua' : `${item.quantityRemaining} de ${item.quantityTotal} restante(s)`}</td>
            <td><span className={item.active ? styles.active : styles.inactive}>{item.active ? 'Ativa' : 'Inativa'}</span></td>
            <td><div className={styles.rowActions}>{canEdit ? <><button type="button" onClick={() => startEdit(item)}>Editar</button><button type="button" disabled={saving} onClick={() => void toggle(item)}>{item.active ? 'Desativar' : 'Ativar'}</button></> : <span>Somente leitura</span>}</div></td>
          </tr>)}</tbody></table></div> : <p className={styles.empty}>Nenhuma recorrência encontrada para os filtros selecionados.</p>}
        </section> : null}
      </div>
    </main>
  );
}

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

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft no-underline transition-colors hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_BUTTON_CLASS = `${BUTTON_CLASS} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;
const FIELD_LABEL_CLASS = 'grid gap-1.5 text-xs font-extrabold text-app-muted';
const FIELD_CONTROL_CLASS =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';
const CARD_CLASS =
  'mb-4 rounded-xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10';
const TABLE_HEADER_CLASS =
  'border-b border-app-border-soft bg-app-surface-muted px-3 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-app-muted';
const TABLE_CELL_CLASS =
  'border-b border-app-border-soft px-3 py-3 align-top text-left text-[13px] text-app-text-soft';

function hasPermission(user: CurrentUserResponse, permission: AppPermission): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin || grant.permission === permission,
  );
}

interface Draft {
  name: string;
  clientId: string;
  period: string;
  nextAt: string;
  quantityMode: TicketRecurrenceQuantityMode;
  quantity: string;
}

const EMPTY_DRAFT: Draft = {
  name: '',
  clientId: '',
  period: '2',
  nextAt: '',
  quantityMode: 'fixa',
  quantity: '1',
};

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
  if (reason instanceof ApiError) {
    return reason.message || 'Não foi possível concluir a operação.';
  }
  return 'Não foi possível concluir a operação.';
}

export function TicketRecurrencesScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const canRead = hasPermission(currentUser, AppPermission.TicketsRead);
  const canCreate = hasPermission(currentUser, AppPermission.TicketsCreate);
  const canEdit = hasPermission(currentUser, AppPermission.TicketsEdit);
  const [data, setData] = useState<
    Awaited<ReturnType<typeof fetchTicketRecurrences>> | null
  >(null);
  const [status, setStatus] =
    useState<TicketRecurrenceStatusFilter>('ativas');
  const [clientId, setClientId] = useState('');
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(canRead);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const filters = useMemo(
    () => ({
      clientId: clientId ? Number(clientId) : undefined,
      period: period ? Number(period) : undefined,
      status,
    }),
    [clientId, period, status],
  );

  const load = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    setError(null);
    try {
      setData(await fetchTicketRecurrences(filters));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [canRead, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setEditingId(0);
    setDraft({
      ...EMPTY_DRAFT,
      clientId: clientId || String(data?.clients[0]?.id ?? ''),
    });
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
    setSaving(true);
    setError(null);
    setNotice(null);
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
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: TicketRecurrenceItem) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await setTicketRecurrenceActive(item.id, !item.active);
      setNotice(item.active ? 'Recorrência desativada.' : 'Recorrência ativada.');
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
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
              Atendimentos
            </span>
            <h1 className="m-0 text-[28px] font-bold tracking-tight text-app-text">
              Recorrências
            </h1>
            <p className="mt-1.5 text-app-muted-strong">
              Gerencie atendimentos que se repetem automaticamente.
            </p>
          </div>
          {canCreate ? (
            <button
              className={PRIMARY_BUTTON_CLASS}
              onClick={startCreate}
              type="button"
            >
              Nova recorrência
            </button>
          ) : null}
        </div>

        {!canRead ? (
          <div className="mb-4 rounded-lg border border-app-border bg-app-surface px-4 py-3.5 text-sm text-app-muted-strong">
            Seu usuário não possui acesso às recorrências.
          </div>
        ) : null}
        {error ? (
          <div
            className="mb-4 rounded-lg border border-app-danger-border bg-app-danger-soft px-4 py-3.5 text-sm text-app-danger"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        {notice ? (
          <div
            className="mb-4 rounded-lg border border-app-success-border bg-app-success-soft px-4 py-3.5 text-sm font-semibold text-app-success"
            role="status"
          >
            {notice}
          </div>
        ) : null}

        {canRead ? (
          <section className={CARD_CLASS} aria-label="Filtros de recorrências">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className={FIELD_LABEL_CLASS}>
                Cliente
                <select
                  className={FIELD_CONTROL_CLASS}
                  onChange={(event) => setClientId(event.target.value)}
                  value={clientId}
                >
                  <option value="">Todos os clientes</option>
                  {data?.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={FIELD_LABEL_CLASS}>
                Período
                <select
                  className={FIELD_CONTROL_CLASS}
                  onChange={(event) => setPeriod(event.target.value)}
                  value={period}
                >
                  <option value="">Todos os períodos</option>
                  {data?.periods.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={FIELD_LABEL_CLASS}>
                Status
                <select
                  className={FIELD_CONTROL_CLASS}
                  onChange={(event) =>
                    setStatus(event.target.value as TicketRecurrenceStatusFilter)
                  }
                  value={status}
                >
                  <option value="ativas">Ativas</option>
                  <option value="inativas">Inativas</option>
                  <option value="todos">Todas</option>
                </select>
              </label>
              <button
                className={`${BUTTON_CLASS} self-end`}
                disabled={loading}
                onClick={() => void load()}
                type="button"
              >
                Atualizar
              </button>
            </div>
          </section>
        ) : null}

        {editingId !== null ? (
          <section className={CARD_CLASS} aria-label="Cadastro de recorrência">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="m-0 text-lg font-bold text-app-text">
                {editingId === 0 ? 'Nova recorrência' : 'Editar recorrência'}
              </h2>
              <button
                className={BUTTON_CLASS}
                onClick={() => setEditingId(null)}
                type="button"
              >
                Fechar
              </button>
            </div>
            <form
              className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
              onSubmit={(event) => void save(event)}
            >
              <label className={FIELD_LABEL_CLASS}>
                Nome
                <input
                  className={FIELD_CONTROL_CLASS}
                  maxLength={180}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  required
                  value={draft.name}
                />
              </label>
              <label className={FIELD_LABEL_CLASS}>
                Cliente
                <select
                  className={FIELD_CONTROL_CLASS}
                  onChange={(event) =>
                    setDraft({ ...draft, clientId: event.target.value })
                  }
                  required
                  value={draft.clientId}
                >
                  <option value="">Selecione</option>
                  {data?.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={FIELD_LABEL_CLASS}>
                Período
                <select
                  className={FIELD_CONTROL_CLASS}
                  onChange={(event) =>
                    setDraft({ ...draft, period: event.target.value })
                  }
                  value={draft.period}
                >
                  {data?.periods.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={FIELD_LABEL_CLASS}>
                Próxima reabertura
                <input
                  className={FIELD_CONTROL_CLASS}
                  onChange={(event) =>
                    setDraft({ ...draft, nextAt: event.target.value })
                  }
                  required
                  type="datetime-local"
                  value={draft.nextAt}
                />
              </label>
              <label className={FIELD_LABEL_CLASS}>
                Quantidade
                <select
                  className={FIELD_CONTROL_CLASS}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      quantityMode: event.target.value as TicketRecurrenceQuantityMode,
                    })
                  }
                  value={draft.quantityMode}
                >
                  <option value="fixa">Quantidade fixa</option>
                  <option value="continua">Enquanto estiver ativa</option>
                </select>
              </label>
              {draft.quantityMode === 'fixa' ? (
                <label className={FIELD_LABEL_CLASS}>
                  Repetições
                  <input
                    className={FIELD_CONTROL_CLASS}
                    max={31}
                    min={1}
                    onChange={(event) =>
                      setDraft({ ...draft, quantity: event.target.value })
                    }
                    required
                    type="number"
                    value={draft.quantity}
                  />
                </label>
              ) : null}
              <div className="flex justify-end gap-2 md:col-span-2 xl:col-span-3 max-sm:[&>*]:flex-1">
                <button
                  className={BUTTON_CLASS}
                  onClick={() => setEditingId(null)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className={PRIMARY_BUTTON_CLASS}
                  disabled={saving}
                  type="submit"
                >
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {canRead ? (
          <section className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm shadow-slate-950/5 dark:shadow-black/10">
            <div className="flex items-center justify-between gap-4 border-b border-app-border-soft px-4 py-3.5">
              <h2 className="m-0 text-lg font-bold text-app-text">Recorrências</h2>
              <span className="rounded-full bg-app-surface-muted px-2.5 py-1 text-xs font-bold text-app-muted-strong">
                {(data?.total ?? 0).toLocaleString('pt-BR')}
              </span>
            </div>

            {loading ? (
              <p className="m-4 rounded-lg border border-app-border bg-app-surface-muted px-4 py-3 text-sm text-app-muted">
                Carregando recorrências…
              </p>
            ) : data?.data.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse">
                  <thead>
                    <tr>
                      <th className={TABLE_HEADER_CLASS}>Nome</th>
                      <th className={TABLE_HEADER_CLASS}>Cliente</th>
                      <th className={TABLE_HEADER_CLASS}>Período</th>
                      <th className={TABLE_HEADER_CLASS}>Próxima reabertura</th>
                      <th className={TABLE_HEADER_CLASS}>Quantidade</th>
                      <th className={TABLE_HEADER_CLASS}>Status</th>
                      <th className={TABLE_HEADER_CLASS}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((item) => (
                      <tr className="hover:bg-app-surface-hover" key={item.id}>
                        <td className={TABLE_CELL_CLASS}>
                          <strong className="block text-app-text">{item.name}</strong>
                          <Link
                            className="mt-1 block text-xs font-semibold text-app-brand no-underline hover:underline"
                            href={`/tickets/${item.modelTicketId}`}
                          >
                            Chamado modelo #{item.modelTicketId}
                          </Link>
                        </td>
                        <td className={TABLE_CELL_CLASS}>{item.clientName}</td>
                        <td className={TABLE_CELL_CLASS}>{item.periodLabel}</td>
                        <td className={TABLE_CELL_CLASS}>
                          {item.nextAt.replace('T', ' ')}
                        </td>
                        <td className={TABLE_CELL_CLASS}>
                          {item.quantityMode === 'continua'
                            ? 'Contínua'
                            : `${item.quantityRemaining} de ${item.quantityTotal} restante(s)`}
                        </td>
                        <td className={TABLE_CELL_CLASS}>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                              item.active
                                ? 'bg-app-success-soft text-app-success'
                                : 'bg-app-surface-muted text-app-muted-strong'
                            }`}
                          >
                            {item.active ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td className={TABLE_CELL_CLASS}>
                          <div className="flex flex-wrap items-center gap-2 whitespace-nowrap">
                            {canEdit ? (
                              <>
                                <button
                                  className={`${BUTTON_CLASS} min-h-8 px-3 py-1.5 text-xs`}
                                  onClick={() => startEdit(item)}
                                  type="button"
                                >
                                  Editar
                                </button>
                                <button
                                  className={`${BUTTON_CLASS} min-h-8 px-3 py-1.5 text-xs`}
                                  disabled={saving}
                                  onClick={() => void toggle(item)}
                                  type="button"
                                >
                                  {item.active ? 'Desativar' : 'Ativar'}
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-app-muted">Somente leitura</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="m-4 rounded-lg border border-app-border bg-app-surface-muted px-4 py-3 text-sm text-app-muted">
                Nenhuma recorrência encontrada para os filtros selecionados.
              </p>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}

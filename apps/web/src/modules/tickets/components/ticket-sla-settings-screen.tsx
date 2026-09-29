"use client";

import type {
  CurrentUserResponse,
  SaveTicketSlaRuleRequest,
  TicketSlaPolicyResponse,
  TicketSlaRule,
  TicketSlaSettings,
} from '@helpdesk/contracts';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { appButtonClass } from '../../../shared/ui/button-styles';
import { SearchSelect } from '../../../shared/ui/search-select';
import {
  createTicketSlaRule,
  deleteTicketSlaRule,
  fetchTicketSlaPolicy,
  updateTicketSlaRule,
  updateTicketSlaSettings,
} from '../api/ticket-sla-settings-api';

const PRIMARY = appButtonClass('primary');
const DANGER = appButtonClass('danger', 'sm');
const SMALL = appButtonClass('secondary', 'sm');
const INPUT =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';

const PRIORITIES: Record<number, string> = {
  0: 'Não informado',
  1: 'Baixa',
  2: 'Média',
  3: 'Alta',
  4: 'Urgente',
};

const EMPTY_RULE: SaveTicketSlaRuleRequest = {
  name: '',
  clientId: null,
  categoryId: null,
  priority: null,
  qualityMinutes: 40,
  clerioMinutes: 60,
  active: true,
  sortOrder: 100,
};

function message(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.status === 403) return 'Somente administradores podem alterar os SLAs.';
    if (reason.body && typeof reason.body === 'object') {
      const value = (reason.body as Record<string, unknown>).message;
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.join(' ');
    }
  }
  return reason instanceof Error
    ? reason.message
    : 'Não foi possível concluir a operação.';
}

function scopeText(rule: TicketSlaRule): string {
  const values = [
    rule.clientName ? `Cliente: ${rule.clientName}` : '',
    rule.categoryName ? `Categoria: ${rule.categoryName}` : '',
    rule.priority !== null ? `Prioridade: ${PRIORITIES[rule.priority] ?? rule.priority}` : '',
  ].filter(Boolean);

  return values.length ? values.join(' · ') : 'Todos os atendimentos';
}

export function TicketSlaSettingsScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [policy, setPolicy] = useState<TicketSlaPolicyResponse | null>(null);
  const [defaults, setDefaults] = useState<TicketSlaSettings>({
    qualityMinutes: 40,
    clerioMinutes: 60,
  });
  const [rule, setRule] = useState<SaveTicketSlaRuleRequest>(EMPTY_RULE);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchTicketSlaPolicy(signal);
      setPolicy(response);
      setDefaults(response.defaults);
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setError(message(reason));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function saveDefaults(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingDefaults(true);
    setError('');
    setSuccess('');
    try {
      const saved = await updateTicketSlaSettings(defaults);
      setDefaults(saved);
      setPolicy((current) => current ? { ...current, defaults: saved } : current);
      setSuccess('Tempos padrão de SLA atualizados.');
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSavingDefaults(false);
    }
  }

  function resetRule() {
    setEditingId(null);
    setRule({
      ...EMPTY_RULE,
      qualityMinutes: policy?.defaults.qualityMinutes ?? 40,
      clerioMinutes: policy?.defaults.clerioMinutes ?? 60,
    });
  }

  function editRule(item: TicketSlaRule) {
    setEditingId(item.id);
    setRule({
      name: item.name,
      clientId: item.clientId,
      categoryId: item.categoryId,
      priority: item.priority,
      qualityMinutes: item.qualityMinutes,
      clerioMinutes: item.clerioMinutes,
      active: item.active,
      sortOrder: item.sortOrder,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingRule(true);
    setError('');
    setSuccess('');
    try {
      if (editingId) {
        await updateTicketSlaRule(editingId, rule);
        setSuccess('Regra de SLA atualizada.');
      } else {
        await createTicketSlaRule(rule);
        setSuccess('Regra de SLA criada.');
      }
      resetRule();
      await load();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSavingRule(false);
    }
  }

  async function toggleRule(item: TicketSlaRule) {
    setError('');
    try {
      await updateTicketSlaRule(item.id, {
        name: item.name,
        clientId: item.clientId,
        categoryId: item.categoryId,
        priority: item.priority,
        qualityMinutes: item.qualityMinutes,
        clerioMinutes: item.clerioMinutes,
        active: !item.active,
        sortOrder: item.sortOrder,
      });
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  }

  async function removeRule(item: TicketSlaRule) {
    if (!window.confirm(`Excluir a regra "${item.name}"?`)) return;
    setError('');
    try {
      await deleteTicketSlaRule(item.id);
      if (editingId === item.id) resetRule();
      setSuccess('Regra de SLA excluída.');
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        subtitle="Defina o padrão global e exceções por cliente, categoria e prioridade."
        title="Motor de SLA"
        user={currentUser}
      />

      <div className="mx-auto grid w-full max-w-[1450px] gap-4 px-6 py-5 max-sm:px-3.5">
        {error ? (
          <div className="rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger" role="alert">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-emerald-300/70 bg-app-success-soft px-4 py-3 text-sm text-app-success" role="status">
            {success}
          </div>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <form
            className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm"
            onSubmit={saveDefaults}
          >
            <div className="mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.08em] text-app-subtle">
                Regra de fallback
              </span>
              <h2 className="m-0 mt-1 text-lg font-black">Padrão global</h2>
              <p className="m-0 mt-1 text-xs leading-relaxed text-app-muted">
                Usado quando nenhuma regra específica combina com o atendimento.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                SLA Qualidade · sem interação
                <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <input
                    className={INPUT}
                    disabled={loading || savingDefaults}
                    max={10080}
                    min={1}
                    onChange={(event) =>
                      setDefaults((current) => ({
                        ...current,
                        qualityMinutes: Number(event.target.value),
                      }))
                    }
                    required
                    type="number"
                    value={defaults.qualityMinutes}
                  />
                  <span className="text-xs text-app-muted">min</span>
                </div>
              </label>

              <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                SLA Clerio · desde abertura
                <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <input
                    className={INPUT}
                    disabled={loading || savingDefaults}
                    max={10080}
                    min={1}
                    onChange={(event) =>
                      setDefaults((current) => ({
                        ...current,
                        clerioMinutes: Number(event.target.value),
                      }))
                    }
                    required
                    type="number"
                    value={defaults.clerioMinutes}
                  />
                  <span className="text-xs text-app-muted">min</span>
                </div>
              </label>
            </div>

            <div className="mt-4 flex justify-end border-t border-app-border-soft pt-3">
              <button className={PRIMARY} disabled={loading || savingDefaults} type="submit">
                {savingDefaults ? 'Salvando…' : 'Salvar padrão'}
              </button>
            </div>
          </form>

          <form
            className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm"
            onSubmit={saveRule}
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.08em] text-app-subtle">
                  Exceção
                </span>
                <h2 className="m-0 mt-1 text-lg font-black">
                  {editingId ? 'Editar regra de SLA' : 'Nova regra de SLA'}
                </h2>
                <p className="m-0 mt-1 text-xs text-app-muted">
                  Campos em “Todos” funcionam como curinga.
                </p>
              </div>
              {editingId ? (
                <button className={SMALL} onClick={resetRule} type="button">
                  Cancelar edição
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-1.5 text-xs font-bold text-app-text-soft xl:col-span-2">
                Nome da regra
                <input
                  className={INPUT}
                  maxLength={120}
                  onChange={(event) => setRule((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ex.: Cliente VIP · Urgente"
                  required
                  value={rule.name}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Ordem
                <input
                  className={INPUT}
                  max={9999}
                  min={0}
                  onChange={(event) => setRule((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
                  required
                  type="number"
                  value={rule.sortOrder}
                />
              </label>

              <label className="flex items-end gap-2 pb-2 text-xs font-bold text-app-text-soft">
                <input
                  checked={rule.active}
                  className="size-4 accent-[var(--app-brand)]"
                  onChange={(event) => setRule((current) => ({ ...current, active: event.target.checked }))}
                  type="checkbox"
                />
                Regra ativa
              </label>

              <div className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Cliente
                <SearchSelect
                  onChange={(values) => setRule((current) => ({ ...current, clientId: values[0] ? Number(values[0]) : null }))}
                  options={(policy?.catalogs.clients ?? []).map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="Todos os clientes"
                  searchPlaceholder="Pesquisar cliente..."
                  value={rule.clientId ? [String(rule.clientId)] : []}
                />
              </div>

              <div className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Categoria
                <SearchSelect
                  onChange={(values) => setRule((current) => ({ ...current, categoryId: values[0] ? Number(values[0]) : null }))}
                  options={(policy?.catalogs.categories ?? []).map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="Todas as categorias"
                  searchPlaceholder="Pesquisar categoria..."
                  value={rule.categoryId ? [String(rule.categoryId)] : []}
                />
              </div>

              <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Prioridade
                <select
                  className={INPUT}
                  onChange={(event) =>
                    setRule((current) => ({
                      ...current,
                      priority: event.target.value === '' ? null : Number(event.target.value),
                    }))
                  }
                  value={rule.priority ?? ''}
                >
                  <option value="">Todas</option>
                  {Object.entries(PRIORITIES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <div />

              <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Qualidade
                <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <input
                    className={INPUT}
                    max={10080}
                    min={1}
                    onChange={(event) => setRule((current) => ({ ...current, qualityMinutes: Number(event.target.value) }))}
                    required
                    type="number"
                    value={rule.qualityMinutes}
                  />
                  <span className="text-xs text-app-muted">min</span>
                </div>
              </label>

              <label className="grid gap-1.5 text-xs font-bold text-app-text-soft">
                Clerio
                <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <input
                    className={INPUT}
                    max={10080}
                    min={1}
                    onChange={(event) => setRule((current) => ({ ...current, clerioMinutes: Number(event.target.value) }))}
                    required
                    type="number"
                    value={rule.clerioMinutes}
                  />
                  <span className="text-xs text-app-muted">min</span>
                </div>
              </label>

              <div className="flex items-end justify-end md:col-span-2">
                <button className={PRIMARY} disabled={savingRule || !rule.name.trim()} type="submit">
                  {savingRule ? 'Salvando…' : editingId ? 'Salvar regra' : 'Criar regra'}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-4 py-3.5">
            <div>
              <h2 className="m-0 text-sm font-black">Regras específicas</h2>
              <p className="m-0 mt-1 text-[11px] text-app-muted">
                A regra mais específica vence. Em empate, menor ordem vence.
              </p>
            </div>
            <span className="rounded-full bg-app-surface-muted px-2.5 py-1 text-[11px] font-bold text-app-muted">
              {policy?.rules.length ?? 0} regra(s)
            </span>
          </header>

          {loading && !policy ? (
            <div className="grid min-h-[180px] place-items-center text-sm text-app-muted">Carregando regras…</div>
          ) : policy?.rules.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-app-surface-muted text-[10px] uppercase tracking-[0.04em] text-app-subtle">
                  <tr>
                    <th className="px-4 py-3">Regra</th>
                    <th className="px-4 py-3">Escopo</th>
                    <th className="px-4 py-3">Qualidade</th>
                    <th className="px-4 py-3">Clerio</th>
                    <th className="px-4 py-3">Ordem</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {policy.rules.map((item) => (
                    <tr className="border-t border-app-border-soft" key={item.id}>
                      <td className="px-4 py-3 font-bold text-app-text">{item.name}</td>
                      <td className="max-w-[440px] px-4 py-3 text-xs text-app-muted">{scopeText(item)}</td>
                      <td className="px-4 py-3 font-semibold">{item.qualityMinutes} min</td>
                      <td className="px-4 py-3 font-semibold">{item.clerioMinutes} min</td>
                      <td className="px-4 py-3">{item.sortOrder}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${item.active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-app-surface-muted text-app-muted'}`}>
                          {item.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button className={SMALL} onClick={() => editRule(item)} type="button">Editar</button>
                          <button className={SMALL} onClick={() => void toggleRule(item)} type="button">
                            {item.active ? 'Desativar' : 'Ativar'}
                          </button>
                          <button className={DANGER} onClick={() => void removeRule(item)} type="button">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid min-h-[180px] place-items-center px-4 text-center">
              <div>
                <strong className="block text-sm">Nenhuma exceção cadastrada</strong>
                <p className="m-0 mt-1 text-xs text-app-muted">
                  Todos os atendimentos estão usando o SLA padrão global.
                </p>
              </div>
            </div>
          )}
        </section>

        <div className="rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-xs leading-relaxed text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-200">
          <strong>Como funciona a precedência:</strong> uma regra com Cliente + Categoria + Prioridade vence uma regra com apenas Cliente. Se duas regras tiverem a mesma especificidade, a menor Ordem é aplicada primeiro. Quando nenhuma regra combinar, o sistema usa o Padrão global.
        </div>
      </div>
    </main>
  );
}

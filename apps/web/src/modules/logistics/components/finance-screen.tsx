"use client";

import type {
  CurrentUserResponse,
  FinanceCatalogOption,
  FinanceCatalogsResponse,
  FinanceListResponse,
  FinancePaymentInput,
  FinancePayableWriteInput,
  FinanceReceiptInput,
  FinanceReceivableWriteInput,
  FinanceRecurringWriteInput,
  FinanceRow,
  FinanceViewKey,
} from '@helpdesk/contracts';
import type { FormEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import {
  createPayable,
  createReceivable,
  createRecurringFinance,
  fetchFinanceCatalogs,
  fetchFinanceView,
  payFinanceAccount,
  receiveFinanceAccount,
  updatePayable,
  updateReceivable,
  updateRecurringFinance,
} from '../api/finance-api';

const BUTTON =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft transition hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY = `${BUTTON} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;
const INPUT =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';

const CONFIG: Record<FinanceViewKey, { title: string; subtitle: string }> = {
  'receivables-accrual': {
    title: 'Contas a Receber · Competência',
    subtitle: 'Acompanhe faturamento, vencimentos, saldos e recebimentos pela competência.',
  },
  'receivables-cashflow': {
    title: 'Contas a Receber · Fluxo',
    subtitle: 'Consulte os recebimentos efetivamente realizados no período.',
  },
  payables: {
    title: 'Contas a Pagar',
    subtitle: 'Gerencie compromissos, vencimentos e baixas financeiras.',
  },
  entries: {
    title: 'Lançamentos',
    subtitle: 'Visão consolidada dos lançamentos previstos de entrada e saída.',
  },
  recurring: {
    title: 'Recorrentes',
    subtitle: 'Gerencie regras mensais de contas a receber e contas a pagar.',
  },
  accounting: {
    title: 'Contabilidade',
    subtitle: 'Fluxo financeiro realizado com classificação contábil e documentação.',
  },
  statements: {
    title: 'Extratos',
    subtitle: 'Consulte o fluxo realizado consolidado para conferência e conciliação.',
  },
};

type Editor =
  | { kind: 'receivable'; id: number | null; values: FinanceReceivableWriteInput }
  | { kind: 'payable'; id: number | null; values: FinancePayableWriteInput }
  | { kind: 'recurring'; id: number | null; values: FinanceRecurringWriteInput }
  | { kind: 'receipt'; id: number; values: FinanceReceiptInput }
  | { kind: 'payment'; id: number; values: FinancePaymentInput }
  | null;

type ActiveEditor = Exclude<Editor, null>;

function patchEditorValues(
  editor: ActiveEditor,
  patch: Record<string, unknown>,
): ActiveEditor {
  switch (editor.kind) {
    case 'receivable':
      return {
        ...editor,
        values: { ...editor.values, ...patch } as FinanceReceivableWriteInput,
      };
    case 'payable':
      return {
        ...editor,
        values: { ...editor.values, ...patch } as FinancePayableWriteInput,
      };
    case 'recurring':
      return {
        ...editor,
        values: { ...editor.values, ...patch } as FinanceRecurringWriteInput,
      };
    case 'receipt':
      return {
        ...editor,
        values: { ...editor.values, ...patch } as FinanceReceiptInput,
      };
    case 'payment':
      return {
        ...editor,
        values: { ...editor.values, ...patch } as FinancePaymentInput,
      };
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function money(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const source = value.slice(0, 10).split('-');
  return source.length === 3 ? `${source[2]}/${source[1]}/${source[0]}` : value;
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.status === 403) return 'Seu usuário não possui acesso a esta operação financeira.';
    if (reason.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
    if (reason.body && typeof reason.body === 'object') {
      const message = (reason.body as Record<string, unknown>).message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.join(' ');
    }
  }
  return reason instanceof Error
    ? reason.message
    : 'Não foi possível concluir a operação.';
}

function firstId(options: FinanceCatalogOption[]): number {
  return options[0]?.id ?? 0;
}

function metadataNumber(row: FinanceRow, key: string): number {
  const value = row.metadata?.[key];
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function metadataString(row: FinanceRow, key: string): string {
  const value = row.metadata?.[key];
  return value === null || value === undefined ? '' : String(value);
}

export function FinanceScreen({
  currentUser,
  view,
}: {
  currentUser: CurrentUserResponse;
  view: FinanceViewKey;
}) {
  const config = CONFIG[view];
  const [draft, setDraft] = useState({
    startDate: firstDayOfMonth(),
    endDate: today(),
    search: '',
  });
  const [filters, setFilters] = useState(draft);
  const [result, setResult] = useState<FinanceListResponse | null>(null);
  const [catalogs, setCatalogs] = useState<FinanceCatalogsResponse | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const next = await fetchFinanceView(view, filters, signal);
      setResult(next);
      if (next.canManage && !catalogs) {
        setCatalogs(await fetchFinanceCatalogs(signal));
      }
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [view, filters, catalogs]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const visibleSubgroups = useMemo(() => {
    if (!catalogs || !editor || !('values' in editor)) return [];
    const values = editor.values as unknown as Record<string, unknown>;
    const groupId = Number(values.groupId ?? 0);
    return catalogs.subgroups.filter(
      (item) => !item.parentId || item.parentId === groupId,
    );
  }, [catalogs, editor]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ ...draft });
  }

  function baseReceivable(row?: FinanceRow): FinanceReceivableWriteInput {
    return {
      clientId: row ? metadataNumber(row, 'clientId') : firstId(catalogs?.clients ?? []),
      description: row?.description ?? '',
      amount: row?.amount ?? 0,
      dueDate: row?.dueDate ?? today(),
      unitId: row ? metadataNumber(row, 'unitId') : firstId(catalogs?.units ?? []),
      groupId: row ? metadataNumber(row, 'groupId') : firstId(catalogs?.groups ?? []),
      subgroupId: row ? metadataNumber(row, 'subgroupId') : firstId(catalogs?.subgroups ?? []),
      classificationId: row ? metadataNumber(row, 'classificationId') : firstId(catalogs?.classifications ?? []),
      documentTypeId: row ? metadataNumber(row, 'documentTypeId') || null : null,
      percentTi: row ? metadataNumber(row, 'percentTi') : 0,
      percentDevops: row ? metadataNumber(row, 'percentDevops') : 0,
      percentMarketing: row ? metadataNumber(row, 'percentMarketing') : 0,
    };
  }

  function basePayable(row?: FinanceRow): FinancePayableWriteInput {
    return {
      description: row?.description ?? '',
      supplier: row?.party ?? '',
      amount: row?.amount ?? 0,
      dueDate: row?.dueDate ?? today(),
      unitId: row ? metadataNumber(row, 'unitId') : firstId(catalogs?.units ?? []),
      groupId: row ? metadataNumber(row, 'groupId') : firstId(catalogs?.groups ?? []),
      subgroupId: row ? metadataNumber(row, 'subgroupId') : firstId(catalogs?.subgroups ?? []),
      classificationId: row ? metadataNumber(row, 'classificationId') : firstId(catalogs?.classifications ?? []),
      documentTypeId: row ? metadataNumber(row, 'documentTypeId') || null : null,
    };
  }

  function baseRecurring(row?: FinanceRow): FinanceRecurringWriteInput {
    const type = metadataString(row ?? ({ metadata: {} } as FinanceRow), 'type') === 'Pagar' ? 'Pagar' : 'Receber';
    return {
      type,
      clientId: row ? metadataNumber(row, 'clientId') || null : firstId(catalogs?.clients ?? []),
      supplier: row ? metadataString(row, 'supplier') : '',
      description: row?.description ?? '',
      amount: row?.amount ?? 0,
      dueDay: row ? metadataNumber(row, 'dueDay') : 10,
      unitId: row ? metadataNumber(row, 'unitId') : firstId(catalogs?.units ?? []),
      groupId: row ? metadataNumber(row, 'groupId') : firstId(catalogs?.groups ?? []),
      subgroupId: row ? metadataNumber(row, 'subgroupId') : firstId(catalogs?.subgroups ?? []),
      classificationId: row ? metadataNumber(row, 'classificationId') : firstId(catalogs?.classifications ?? []),
      documentTypeId: row ? metadataNumber(row, 'documentTypeId') || null : null,
      percentTi: row ? metadataNumber(row, 'percentTi') : 0,
      percentDevops: row ? metadataNumber(row, 'percentDevops') : 0,
      percentMarketing: row ? metadataNumber(row, 'percentMarketing') : 0,
      active: row?.active ?? true,
    };
  }

  function startCreate() {
    if (!catalogs) return;
    if (view === 'receivables-accrual') {
      setEditor({ kind: 'receivable', id: null, values: baseReceivable() });
    } else if (view === 'payables') {
      setEditor({ kind: 'payable', id: null, values: basePayable() });
    } else if (view === 'recurring') {
      setEditor({ kind: 'recurring', id: null, values: baseRecurring() });
    }
  }

  function startEdit(row: FinanceRow) {
    if (!row.sourceId) return;
    if (row.kind === 'receivable') {
      setEditor({ kind: 'receivable', id: row.sourceId, values: baseReceivable(row) });
    } else if (row.kind === 'payable') {
      setEditor({ kind: 'payable', id: row.sourceId, values: basePayable(row) });
    } else if (row.kind === 'recurring') {
      setEditor({ kind: 'recurring', id: row.sourceId, values: baseRecurring(row) });
    }
  }

  function startSettlement(row: FinanceRow) {
    if (!row.sourceId || !catalogs) return;
    const agencyId = firstId(catalogs.agencies);
    if (row.kind === 'receivable') {
      setEditor({
        kind: 'receipt',
        id: row.sourceId,
        values: {
          amount: row.balance ?? row.amount,
          date: today(),
          agencyId,
          observation: '',
        },
      });
    } else if (row.kind === 'payable') {
      setEditor({
        kind: 'payment',
        id: row.sourceId,
        values: { date: today(), agencyId, observation: '' },
      });
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editor.kind === 'receivable') {
        if (editor.id) await updateReceivable(editor.id, editor.values);
        else await createReceivable(editor.values);
        setSuccess('Conta a receber salva com sucesso.');
      } else if (editor.kind === 'payable') {
        if (editor.id) await updatePayable(editor.id, editor.values);
        else await createPayable(editor.values);
        setSuccess('Conta a pagar salva com sucesso.');
      } else if (editor.kind === 'recurring') {
        if (editor.id) await updateRecurringFinance(editor.id, editor.values);
        else await createRecurringFinance(editor.values);
        setSuccess('Recorrência salva com sucesso.');
      } else if (editor.kind === 'receipt') {
        await receiveFinanceAccount(editor.id, editor.values);
        setSuccess('Recebimento registrado com sucesso.');
      } else {
        await payFinanceAccount(editor.id, editor.values);
        setSuccess('Pagamento registrado com sucesso.');
      }
      setEditor(null);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  const canCreate =
    result?.canManage &&
    (view === 'receivables-accrual' || view === 'payables' || view === 'recurring');

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          canCreate ? (
            <button className={PRIMARY} disabled={!catalogs} onClick={startCreate} type="button">
              {view === 'recurring' ? 'Nova recorrência' : 'Novo lançamento'}
            </button>
          ) : undefined
        }
        subtitle={config.subtitle}
        title={config.title}
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1500px] px-6 py-6 max-sm:px-3.5">
        {error ? (
          <div className="mb-4 rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger" role="alert">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-xl border border-emerald-300/70 bg-app-success-soft px-4 py-3 text-sm text-app-success" role="status">
            {success}
          </div>
        ) : null}

        {editor && catalogs ? (
          <FinanceEditor
            catalogs={catalogs}
            editor={editor}
            saving={saving}
            subgroups={visibleSubgroups}
            onCancel={() => setEditor(null)}
            onChange={setEditor}
            onSubmit={save}
          />
        ) : null}

        <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ['Entradas', result?.summary.inflow ?? 0, true],
            ['Saídas', result?.summary.outflow ?? 0, true],
            ['Saldo', result?.summary.balance ?? 0, true],
            ['A receber', result?.summary.openReceivables ?? 0, true],
            ['A pagar', result?.summary.openPayables ?? 0, true],
            ['Registros', result?.summary.count ?? 0, false],
          ].map(([label, value, currency]) => (
            <div className="rounded-xl border border-app-border bg-app-surface p-3 shadow-sm" key={String(label)}>
              <span className="block text-[10px] font-black uppercase tracking-[0.04em] text-app-muted">{label}</span>
              <strong className="mt-1 block text-lg">
                {currency ? money(Number(value)) : Number(value).toLocaleString('pt-BR')}
              </strong>
            </div>
          ))}
        </section>

        <form
          className="mb-4 grid gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm md:grid-cols-[1fr_1fr_minmax(220px,2fr)_auto]"
          onSubmit={applyFilters}
        >
          <label className="grid gap-1.5 text-xs font-bold text-app-muted">
            Data inicial
            <input className={INPUT} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} type="date" value={draft.startDate} />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-app-muted">
            Data final
            <input className={INPUT} onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))} type="date" value={draft.endDate} />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-app-muted">
            Busca
            <input className={INPUT} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} placeholder="Cliente, fornecedor, descrição ou classificação" type="search" value={draft.search} />
          </label>
          <div className="flex items-end">
            <button className={PRIMARY} disabled={loading} type="submit">
              {loading ? 'Atualizando…' : 'Aplicar'}
            </button>
          </div>
        </form>

        <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse">
              <thead className="bg-app-surface-muted">
                <tr>
                  <th className="px-3 py-3 text-left text-[10px] font-black uppercase text-app-muted">Data</th>
                  <th className="px-3 py-3 text-left text-[10px] font-black uppercase text-app-muted">Parte</th>
                  <th className="px-3 py-3 text-left text-[10px] font-black uppercase text-app-muted">Descrição</th>
                  <th className="px-3 py-3 text-left text-[10px] font-black uppercase text-app-muted">Classificação</th>
                  <th className="px-3 py-3 text-right text-[10px] font-black uppercase text-app-muted">Valor</th>
                  <th className="px-3 py-3 text-right text-[10px] font-black uppercase text-app-muted">Saldo</th>
                  <th className="px-3 py-3 text-left text-[10px] font-black uppercase text-app-muted">Status</th>
                  {result?.canManage ? <th className="px-3 py-3 text-right text-[10px] font-black uppercase text-app-muted">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {(result?.rows ?? []).map((row) => (
                  <tr className="border-t border-app-border-soft hover:bg-app-surface-muted" key={row.id}>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-app-muted-strong">{formatDate(row.date ?? row.dueDate)}</td>
                    <td className="max-w-[220px] px-3 py-3 text-sm font-semibold">{row.party || '—'}</td>
                    <td className="max-w-[320px] px-3 py-3">
                      <strong className="block truncate text-sm">{row.description || '—'}</strong>
                      <small className="block truncate text-[10px] text-app-muted">
                        {[row.unit, row.group, row.subgroup].filter(Boolean).join(' · ')}
                      </small>
                    </td>
                    <td className="max-w-[180px] px-3 py-3 text-xs text-app-muted-strong">{row.classification || row.documentType || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-bold">{money(row.amount)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-sm">{row.balance === null ? '—' : money(row.balance)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-app-surface-muted px-2 py-1 text-[10px] font-black uppercase text-app-text-soft">{row.status || '—'}</span>
                    </td>
                    {result?.canManage ? (
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          {['receivable', 'payable', 'recurring'].includes(row.kind) ? (
                            <button className={BUTTON} onClick={() => startEdit(row)} type="button">Editar</button>
                          ) : null}
                          {row.kind === 'receivable' && (row.balance ?? 0) > 0 ? (
                            <button className={PRIMARY} onClick={() => startSettlement(row)} type="button">Receber</button>
                          ) : null}
                          {row.kind === 'payable' && row.balance !== 0 ? (
                            <button className={PRIMARY} onClick={() => startSettlement(row)} type="button">Pagar</button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !error && result?.rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-app-muted">Nenhum registro encontrado.</div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function FinanceEditor({
  catalogs,
  editor,
  saving,
  subgroups,
  onCancel,
  onChange,
  onSubmit,
}: {
  catalogs: FinanceCatalogsResponse;
  editor: Exclude<Editor, null>;
  saving: boolean;
  subgroups: FinanceCatalogOption[];
  onCancel: () => void;
  onChange: (editor: Exclude<Editor, null>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const label =
    editor.kind === 'receipt'
      ? 'Registrar recebimento'
      : editor.kind === 'payment'
        ? 'Registrar pagamento'
        : editor.id
          ? 'Editar lançamento'
          : 'Novo lançamento';

  if (editor.kind === 'receipt' || editor.kind === 'payment') {
    return (
      <form className="mb-4 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm" onSubmit={onSubmit}>
        <div className="mb-4 flex items-center justify-between border-b border-app-border-soft pb-3">
          <h2 className="m-0 text-base font-bold">{label}</h2>
          <button className={BUTTON} onClick={onCancel} type="button">Fechar</button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {'amount' in editor.values ? (
            <Field label="Valor">
              <input
                className={INPUT}
                min="0.01"
                onChange={(event) => onChange(patchEditorValues(editor, { amount: Number(event.target.value) }))}
                step="0.01"
                type="number"
                value={editor.values.amount}
              />
            </Field>
          ) : null}
          <Field label="Data">
            <input
              className={INPUT}
              onChange={(event) => onChange(patchEditorValues(editor, { date: event.target.value }))}
              type="date"
              value={editor.values.date}
            />
          </Field>
          <Field label="Conta bancária">
            <Select
              options={catalogs.agencies}
              value={editor.values.agencyId}
              onChange={(agencyId) => onChange(patchEditorValues(editor, { agencyId }))}
            />
          </Field>
          <div className="md:col-span-3">
            <Field label="Observação">
              <input
                className={INPUT}
                onChange={(event) => onChange(patchEditorValues(editor, { observation: event.target.value }))}
                value={editor.values.observation ?? ''}
              />
            </Field>
          </div>
        </div>
        <Actions saving={saving} onCancel={onCancel} />
      </form>
    );
  }

  const values = editor.values;
  const common = (
    <>
      <Field label="Descrição">
        <input className={INPUT} maxLength={255} onChange={(event) => onChange(patchEditorValues(editor, { description: event.target.value }))} required value={values.description} />
      </Field>
      <Field label="Valor">
        <input className={INPUT} min="0.01" onChange={(event) => onChange(patchEditorValues(editor, { amount: Number(event.target.value) }))} required step="0.01" type="number" value={values.amount} />
      </Field>
      {editor.kind === 'recurring' ? (
        <Field label="Dia do vencimento">
          <input
            className={INPUT}
            max="31"
            min="1"
            onChange={(event) =>
              onChange(patchEditorValues(editor, { dueDay: Number(event.target.value) }))
            }
            required
            type="number"
            value={editor.values.dueDay}
          />
        </Field>
      ) : (
        <Field label="Vencimento">
          <input
            className={INPUT}
            onChange={(event) =>
              onChange(patchEditorValues(editor, { dueDate: event.target.value }))
            }
            required
            type="date"
            value={editor.values.dueDate}
          />
        </Field>
      )}
      <Field label="Unidade de negócio">
        <Select options={catalogs.units} value={values.unitId} onChange={(unitId) => onChange(patchEditorValues(editor, { unitId }))} />
      </Field>
      <Field label="Grupo">
        <Select options={catalogs.groups} value={values.groupId} onChange={(groupId) => onChange(
          patchEditorValues(editor, {
            groupId,
            subgroupId:
              subgroups.find((item) => item.parentId === groupId)?.id ?? 0,
          }),
        )} />
      </Field>
      <Field label="Subgrupo">
        <Select options={subgroups} value={values.subgroupId} onChange={(subgroupId) => onChange(patchEditorValues(editor, { subgroupId }))} />
      </Field>
      <Field label="Classificação">
        <Select options={catalogs.classifications} value={values.classificationId} onChange={(classificationId) => onChange(patchEditorValues(editor, { classificationId }))} />
      </Field>
      <Field label="Tipo de documento">
        <Select allowEmpty options={catalogs.documentTypes} value={values.documentTypeId ?? 0} onChange={(documentTypeId) => onChange(
          patchEditorValues(editor, {
            documentTypeId: documentTypeId || null,
          }),
        )} />
      </Field>
    </>
  );

  return (
    <form className="mb-4 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm" onSubmit={onSubmit}>
      <div className="mb-4 flex items-center justify-between border-b border-app-border-soft pb-3">
        <div>
          <h2 className="m-0 text-base font-bold">{label}</h2>
          <p className="m-0 mt-1 text-xs text-app-muted">Dados gravados diretamente no banco nivel3.</p>
        </div>
        <button className={BUTTON} onClick={onCancel} type="button">Fechar</button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {editor.kind === 'receivable' ? (
          <Field label="Cliente">
            <Select options={catalogs.clients} value={editor.values.clientId} onChange={(clientId) => onChange(patchEditorValues(editor, { clientId }))} />
          </Field>
        ) : null}

        {editor.kind === 'payable' ? (
          <Field label="Fornecedor / favorecido">
            <input className={INPUT} maxLength={100} onChange={(event) => onChange(patchEditorValues(editor, { supplier: event.target.value }))} value={editor.values.supplier ?? ''} />
          </Field>
        ) : null}

        {editor.kind === 'recurring' ? (
          <>
            <Field label="Tipo">
              <select className={INPUT} onChange={(event) => onChange(
                patchEditorValues(editor, {
                  type: event.target.value as 'Receber' | 'Pagar',
                }),
              )} value={editor.values.type}>
                <option value="Receber">Receber</option>
                <option value="Pagar">Pagar</option>
              </select>
            </Field>
            {editor.values.type === 'Receber' ? (
              <Field label="Cliente">
                <Select options={catalogs.clients} value={editor.values.clientId ?? 0} onChange={(clientId) => onChange(patchEditorValues(editor, { clientId }))} />
              </Field>
            ) : (
              <Field label="Fornecedor / favorecido">
                <input className={INPUT} maxLength={100} onChange={(event) => onChange(patchEditorValues(editor, { supplier: event.target.value }))} value={editor.values.supplier ?? ''} />
              </Field>
            )}
          </>
        ) : null}

        {common}

        {editor.kind !== 'payable' ? (
          <>
            <Field label="% TI">
              <input className={INPUT} max="100" min="0" onChange={(event) => onChange(
                patchEditorValues(editor, {
                  percentTi: Number(event.target.value),
                }),
              )} type="number" value={editor.values.percentTi ?? 0} />
            </Field>
            <Field label="% DevOps">
              <input className={INPUT} max="100" min="0" onChange={(event) => onChange(
                patchEditorValues(editor, {
                  percentDevops: Number(event.target.value),
                }),
              )} type="number" value={editor.values.percentDevops ?? 0} />
            </Field>
            <Field label="% Marketing">
              <input className={INPUT} max="100" min="0" onChange={(event) => onChange(
                patchEditorValues(editor, {
                  percentMarketing: Number(event.target.value),
                }),
              )} type="number" value={editor.values.percentMarketing ?? 0} />
            </Field>
          </>
        ) : null}

        {editor.kind === 'recurring' ? (
          <Field label="Situação">
            <select className={INPUT} onChange={(event) => onChange(
              patchEditorValues(editor, {
                active: event.target.value === '1',
              }),
            )} value={editor.values.active ? '1' : '0'}>
              <option value="1">Ativa</option>
              <option value="0">Inativa</option>
            </select>
          </Field>
        ) : null}
      </div>

      <Actions saving={saving} onCancel={onCancel} />
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-app-muted">
      {label}
      {children}
    </label>
  );
}

function Select({
  options,
  value,
  onChange,
  allowEmpty = false,
}: {
  options: FinanceCatalogOption[];
  value: number;
  onChange: (value: number) => void;
  allowEmpty?: boolean;
}) {
  return (
    <select className={INPUT} onChange={(event) => onChange(Number(event.target.value))} required={!allowEmpty} value={value}>
      {allowEmpty ? <option value="0">Não informado</option> : null}
      {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
  );
}

function Actions({ saving, onCancel }: { saving: boolean; onCancel: () => void }) {
  return (
    <div className="mt-5 flex justify-end gap-2 border-t border-app-border-soft pt-4">
      <button className={BUTTON} onClick={onCancel} type="button">Cancelar</button>
      <button className={PRIMARY} disabled={saving} type="submit">{saving ? 'Salvando…' : 'Salvar'}</button>
    </div>
  );
}

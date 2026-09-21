"use client";

import type {
  CurrentUserResponse,
  RegistrationFieldDefinition,
  RegistrationFieldOption,
  RegistrationListResponse,
  RegistrationRecord,
  RegistrationResourceKey,
} from '@helpdesk/contracts';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import {
  createRegistration,
  fetchRegistration,
  updateRegistration,
} from '../api/registrations-api';

const BUTTON =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface px-4 text-sm font-bold text-app-text-soft transition hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY = `${BUTTON} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover dark:text-slate-950`;
const INPUT =
  'min-h-10 w-full rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';

function message(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const value = (reason.body as Record<string, unknown>).message;
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(' ');
  }
  return reason instanceof Error ? reason.message : 'Não foi possível concluir a operação.';
}

function initialValues(
  result: RegistrationListResponse,
  classificationOptions: RegistrationFieldOption[],
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    result.definition.fields.map((field) => {
      if (field.type === 'boolean') return [field.key, false];
      const options =
        field.optionSource === 'accounting-classifications'
          ? classificationOptions
          : field.options ?? [];
      if (field.type === 'select' && options[0]) return [field.key, options[0].value];
      return [field.key, ''];
    }),
  );
}

function primary(record: RegistrationRecord, resource: RegistrationResourceKey): string {
  if (resource === 'clients') {
    return String(record.values.tradeName || record.values.legalName || `Cliente #${record.id}`);
  }
  return String(record.values.name || `Registro #${record.id}`);
}

function secondary(record: RegistrationRecord, resource: RegistrationResourceKey): string {
  if (resource === 'clients') {
    const legal = String(record.values.legalName ?? '');
    const city = String(record.values.city ?? '');
    const state = String(record.values.state ?? '');
    return [legal, [city, state].filter(Boolean).join(' / ')].filter(Boolean).join(' · ');
  }
  if (resource === 'categories') {
    const sector = Number(record.values.sector);
    return sector === 1 ? 'TI' : sector === 2 ? 'Marketing' : sector === 3 ? 'ADM / DevOps' : 'Sem setor';
  }
  const classification = String(record.values.accountingClassificationName ?? '');
  return classification ? `Classificação: ${classification}` : '';
}

function services(record: RegistrationRecord): string[] {
  const labels: string[] = [];
  if (record.values.ti) labels.push('TI');
  if (record.values.devops) labels.push('DevOps');
  if (record.values.marketing) labels.push('Marketing');
  return labels;
}

export function RegistrationScreen({
  currentUser,
  resource,
}: {
  currentUser: CurrentUserResponse;
  resource: RegistrationResourceKey;
}) {
  const [result, setResult] = useState<RegistrationListResponse | null>(null);
  const [classificationOptions, setClassificationOptions] = useState<RegistrationFieldOption[]>([]);
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<RegistrationRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string | number | boolean | null>>({});
  const [status, setStatus] = useState<0 | 1>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async (value: string, signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const next = await fetchRegistration(resource, value, signal);
      setResult(next);

      if (
        next.definition.fields.some(
          (field) => field.optionSource === 'accounting-classifications',
        )
      ) {
        const classifications = await fetchRegistration(
          'accounting-classifications',
          '',
          signal,
        );
        setClassificationOptions(
          classifications.items
            .filter((item) => item.status === 1)
            .map((item) => ({
              value: item.id,
              label: String(item.values.name ?? `#${item.id}`),
            })),
        );
      } else {
        setClassificationOptions([]);
      }
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(message(reason));
    } finally {
      setLoading(false);
    }
  }, [resource]);

  useEffect(() => {
    const controller = new AbortController();
    void load(search, controller.signal);
    return () => controller.abort();
  }, [load, search]);

  const fields = result?.definition.fields ?? [];
  const title = result?.definition.title ?? 'Cadastros';
  const subtitle = result?.definition.subtitle ?? 'Carregando cadastro…';

  const activeCount = useMemo(
    () => result?.items.filter((item) => item.status === 1).length ?? 0,
    [result],
  );

  function fieldOptions(field: RegistrationFieldDefinition): RegistrationFieldOption[] {
    return field.optionSource === 'accounting-classifications'
      ? classificationOptions
      : field.options ?? [];
  }

  function startCreate() {
    if (!result) return;
    setEditing(null);
    setValues(initialValues(result, classificationOptions));
    setStatus(1);
    setError('');
    setSuccess('');
    setFormOpen(true);
  }

  function startEdit(record: RegistrationRecord) {
    setEditing(record);
    setValues({ ...record.values });
    setStatus(record.status);
    setError('');
    setSuccess('');
    setFormOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = { status, values };
      if (editing) {
        await updateRegistration(resource, editing.id, payload);
        setSuccess(`${result.definition.singular} atualizado com sucesso.`);
      } else {
        await createRegistration(resource, payload);
        setSuccess(`${result.definition.singular} cadastrado com sucesso.`);
      }
      setFormOpen(false);
      setEditing(null);
      await load(search);
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          result?.canCreate ? (
            <button className={PRIMARY} onClick={startCreate} type="button">
              Novo cadastro
            </button>
          ) : undefined
        }
        subtitle={subtitle}
        title={title}
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1450px] px-6 py-6 max-sm:px-3.5">
        {error ? (
          <div className="mb-4 rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger" role="alert">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-xl border border-app-success-border bg-app-success-soft px-4 py-3 text-sm text-app-success" role="status">
            {success}
          </div>
        ) : null}

        {formOpen && result ? (
          <form
            className="mb-5 rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm"
            onSubmit={submit}
          >
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-app-border-soft pb-4">
              <div>
                <h2 className="m-0 text-lg font-bold">
                  {editing ? `Editar ${result.definition.singular}` : `Novo ${result.definition.singular}`}
                </h2>
                <p className="m-0 mt-1 text-sm text-app-muted">
                  Preencha os dados e salve para atualizar o cadastro no banco nivel3.
                </p>
              </div>
              <button className={BUTTON} onClick={() => setFormOpen(false)} type="button">
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {fields.map((field) => {
                const value = values[field.key] ?? (field.type === 'boolean' ? false : '');
                if (field.type === 'boolean') {
                  return (
                    <label className="grid gap-1.5 text-sm font-semibold" key={field.key}>
                      {field.label}
                      <select
                        className={INPUT}
                        disabled={saving}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [field.key]: event.target.value === '1',
                          }))
                        }
                        value={value ? '1' : '0'}
                      >
                        <option value="1">Sim</option>
                        <option value="0">Não</option>
                      </select>
                    </label>
                  );
                }

                if (field.type === 'select') {
                  return (
                    <label className="grid gap-1.5 text-sm font-semibold" key={field.key}>
                      {field.label}
                      <select
                        className={INPUT}
                        disabled={saving}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const option = fieldOptions(field).find((item) => String(item.value) === raw);
                          setValues((current) => ({
                            ...current,
                            [field.key]: typeof option?.value === 'number' ? Number(raw) : raw,
                          }));
                        }}
                        required={field.required}
                        value={String(value)}
                      >
                        {fieldOptions(field).map((option) => (
                          <option key={String(option.value)} value={String(option.value)}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                return (
                  <label className="grid gap-1.5 text-sm font-semibold" key={field.key}>
                    {field.label}
                    <input
                      className={INPUT}
                      disabled={saving}
                      maxLength={field.maxLength}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      placeholder={field.placeholder}
                      required={field.required}
                      type={field.type}
                      value={String(value)}
                    />
                  </label>
                );
              })}

              <label className="grid gap-1.5 text-sm font-semibold">
                Situação
                <select
                  className={INPUT}
                  disabled={saving}
                  onChange={(event) => setStatus(event.target.value === '1' ? 1 : 0)}
                  value={String(status)}
                >
                  <option value="1">Ativo</option>
                  <option value="0">Inativo</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button className={BUTTON} onClick={() => setFormOpen(false)} type="button">
                Cancelar
              </button>
              <button className={PRIMARY} disabled={saving} type="submit">
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        ) : null}

        <div className="mb-4 grid gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <label className="grid gap-1.5 text-sm font-semibold">
            Buscar
            <input
              className={INPUT}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Nome, razão social ou CNPJ"
              type="search"
              value={draftSearch}
            />
          </label>
          <button className={BUTTON} onClick={() => setSearch(draftSearch.trim())} type="button">
            Buscar
          </button>
          <div className="flex min-h-10 items-center justify-end gap-2 text-sm text-app-muted">
            <strong className="text-app-text">{activeCount}</strong> ativos
            <span>·</span>
            <strong className="text-app-text">{result?.items.length ?? 0}</strong> exibidos
          </div>
        </div>

        {loading && !result ? (
          <div className="rounded-2xl border border-app-border bg-app-surface p-8 text-center text-app-muted">
            Carregando cadastro…
          </div>
        ) : null}

        {result ? (
          <div className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
            {result.items.length ? (
              <div className="divide-y divide-app-border-soft">
                {result.items.map((record) => (
                  <article
                    className="flex items-center justify-between gap-4 px-4 py-3.5 max-sm:items-start"
                    key={record.id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-app-text">{primary(record, resource)}</strong>
                        <span
                          className={
                            record.status === 1
                              ? 'rounded-full bg-app-success-soft px-2 py-1 text-[10px] font-black uppercase text-app-success'
                              : 'rounded-full bg-app-surface-muted px-2 py-1 text-[10px] font-black uppercase text-app-muted'
                          }
                        >
                          {record.status === 1 ? 'Ativo' : 'Inativo'}
                        </span>
                        {resource === 'clients'
                          ? services(record).map((label) => (
                              <span
                                className="rounded-full border border-app-border px-2 py-1 text-[10px] font-bold text-app-muted-strong"
                                key={label}
                              >
                                {label}
                              </span>
                            ))
                          : null}
                      </div>
                      {secondary(record, resource) ? (
                        <p className="m-0 mt-1 truncate text-xs text-app-muted">
                          {secondary(record, resource)}
                        </p>
                      ) : null}
                    </div>

                    {result.canEdit ? (
                      <button className={BUTTON} onClick={() => startEdit(record)} type="button">
                        Editar
                      </button>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-app-muted">
                Nenhum registro encontrado.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}

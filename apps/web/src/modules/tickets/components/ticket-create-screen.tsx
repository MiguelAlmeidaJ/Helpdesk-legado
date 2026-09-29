"use client";

import type {
  CurrentUserResponse,
  TicketCatalogOption,
  TicketCreateCatalogsResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { appButtonClass } from '../../../shared/ui/button-styles';
import {
  SearchSelect,
  type SearchSelectOption,
} from '../../../shared/ui/search-select';
import {
  createTicket,
  fetchTicketCreateCatalogs,
  fetchTicketCreateItems,
  fetchTicketCreateSubcategories,
  fetchTicketLocations,
  fetchTicketRequesters,
} from '../api/tickets-api';

const BUTTON_CLASS = appButtonClass('secondary');
const PRIMARY_BUTTON_CLASS = appButtonClass('primary');
const FIELD_LABEL_CLASS = 'grid min-w-0 gap-1 text-[11px] font-extrabold text-app-muted';
const FIELD_CONTROL_CLASS =
  'min-h-9 w-full min-w-0 rounded-lg border border-app-border-strong bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-55';
const TEXTAREA_CLASS = `${FIELD_CONTROL_CLASS} resize-y py-2`;

function localDateTime(): string {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return now.toISOString().slice(0, 16);
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.body && typeof reason.body === 'object') {
    const message = (reason.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  return reason instanceof ApiError
    ? `A API respondeu com erro ${reason.status}.`
    : 'Não foi possível concluir a operação.';
}

function selectOptions(
  values: TicketCatalogOption[],
  extra: SearchSelectOption[] = [],
): SearchSelectOption[] {
  return [
    ...extra,
    ...values.map((option) => ({
      value: String(option.id),
      label: option.name,
    })),
  ];
}

export function TicketCreateScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const router = useRouter();
  const [createCatalogs, setCreateCatalogs] =
    useState<TicketCreateCatalogsResponse | null>(null);
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
  const [machineName, setMachineName] = useState('');
  const [description, setDescription] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurrenceAt, setRecurrenceAt] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState('2');
  const [remaining, setRemaining] = useState('1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = Boolean(
    clientId &&
      requesterId &&
      locationId &&
      categoryId &&
      openingAt &&
      description.trim() &&
      (!recurring || recurrenceAt),
  );

  useEffect(() => {
    fetchTicketCreateCatalogs()
      .then((creation) => setCreateCatalogs(creation))
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
  }, []);

  async function changeClient(value: string) {
    setClientId(value);
    setRequesterId('');
    setLocationId('');
    setRequesters([]);
    setLocations([]);
    if (!value) return;
    try {
      const [nextRequesters, nextLocations] = await Promise.all([
        fetchTicketRequesters(Number(value)),
        fetchTicketLocations(Number(value)),
      ]);
      setRequesters(nextRequesters);
      setLocations(nextLocations);
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
    if (!value) return;
    try {
      setSubcategories(await fetchTicketCreateSubcategories(Number(value)));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  async function changeSubcategory(value: string) {
    setSubcategoryId(value);
    setItemId('0');
    setItems([]);
    if (!value || value === '0') return;
    try {
      setItems(await fetchTicketCreateItems(Number(value)));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  function resetForm() {
    setClientId('');
    setRequesterId('');
    setLocationId('');
    setRequesters([]);
    setLocations([]);
    setTypeId('3');
    setCategoryId('');
    setSubcategoryId('0');
    setItemId('0');
    setSubcategories([]);
    setItems([]);
    setLevelId('1');
    setPriorityId('1');
    setFormId('1');
    setTechnicianId('0');
    setOpeningAt(localDateTime());
    setMachineName('');
    setDescription('');
    setRecurring(false);
    setRecurrenceAt('');
    setRecurrenceRule('2');
    setRemaining('1');
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await createTicket({
        clientId: Number(clientId),
        requesterId: Number(requesterId),
        locationId: Number(locationId),
        typeId: Number(typeId),
        categoryId: Number(categoryId),
        subcategoryId: Number(subcategoryId),
        itemId: Number(itemId),
        levelId: Number(levelId),
        priorityId: Number(priorityId),
        formId: Number(formId),
        openingDescription: description,
        machineName: machineName.trim() || null,
        openingAt,
        technicianId: Number(technicianId),
        recurrence: recurring
          ? {
              recurrenceAt,
              rule: Number(recurrenceRule) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
              remaining: Number(remaining),
            }
          : null,
      });
      router.push(`/atendimentos/${response.id}`);
      router.refresh();
    } catch (reason) {
      setError(errorMessage(reason));
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          <Link className={BUTTON_CLASS} href="/atendimentos">
            Voltar à lista
          </Link>
        }
        subtitle="Registre uma solicitação imediata, agendada ou recorrente."
        title="Novo atendimento"
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1500px] px-6 py-4 max-sm:px-3.5 max-sm:py-3">

        {error ? (
          <div
            className="mb-4 rounded-lg border border-app-danger-border bg-app-danger-soft px-4 py-3.5 text-sm text-app-danger"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        {loading ? (
          <div
            aria-label="Carregando"
            className="mb-3 h-1 overflow-hidden rounded-full bg-app-border"
            role="progressbar"
          >
            <div className="h-full w-1/3 animate-pulse rounded-full bg-app-brand" />
          </div>
        ) : null}

        <form
          className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm shadow-slate-950/5 dark:shadow-black/10 max-sm:p-3.5"
          onSubmit={submit}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-app-border-soft pb-3">
            <div>
              <strong className="block text-sm text-app-text">Dados do atendimento</strong>
              <p className="m-0 mt-0.5 text-[11px] text-app-muted">
                Preencha os dados essenciais e cadastre o atendimento.
              </p>
            </div>
            <span
              className={[
                'rounded-full px-3 py-1.5 text-xs font-extrabold',
                canSubmit
                  ? 'bg-app-success-soft text-app-success'
                  : 'bg-app-surface-muted text-app-muted',
              ].join(' ')}
            >
              {canSubmit ? 'Pronto para cadastrar' : 'Preencha os campos obrigatórios'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="border-b border-app-border-soft pb-1 sm:col-span-2 xl:col-span-4">
              <h2 className="m-0 text-xs font-extrabold uppercase tracking-[0.04em] text-app-text-soft">Solicitação</h2>
            </div>
            <div className={`${FIELD_LABEL_CLASS} xl:col-span-2`}>
              <span>Cliente</span>
              <SearchSelect
                compact
                disabled={saving}
                onChange={(values) => void changeClient(values[0] ?? '')}
                options={selectOptions(createCatalogs?.clients ?? [])}
                placeholder="Selecione um cliente"
                searchPlaceholder="Pesquisar cliente..."
                value={clientId ? [clientId] : []}
              />
            </div>
            <div className={FIELD_LABEL_CLASS}>
              <span>Solicitante</span>
              <SearchSelect
                compact
                disabled={saving || !clientId}
                onChange={(values) => setRequesterId(values[0] ?? '')}
                options={selectOptions(requesters)}
                placeholder={clientId ? 'Selecione o solicitante' : 'Selecione o cliente primeiro'}
                searchPlaceholder="Pesquisar solicitante..."
                value={requesterId ? [requesterId] : []}
              />
            </div>
            <div className={FIELD_LABEL_CLASS}>
              <span>Local</span>
              <SearchSelect
                compact
                disabled={saving || !clientId}
                onChange={(values) => setLocationId(values[0] ?? '')}
                options={selectOptions(locations)}
                placeholder={clientId ? 'Selecione o local' : 'Selecione o cliente primeiro'}
                searchPlaceholder="Pesquisar local..."
                value={locationId ? [locationId] : []}
              />
            </div>
            <div className="mt-1 border-b border-app-border-soft pb-1 sm:col-span-2 xl:col-span-4">
              <h2 className="m-0 text-xs font-extrabold uppercase tracking-[0.04em] text-app-text-soft">Classificação e execução</h2>
            </div>
            <div className={FIELD_LABEL_CLASS}>
              <span>Tipo</span>
              <SearchSelect
                allowClear={false}
                compact
                disabled={saving}
                onChange={(values) => setTypeId(values[0] ?? typeId)}
                options={selectOptions(createCatalogs?.types ?? [])}
                placeholder="Selecione o tipo"
                searchable={false}
                value={typeId ? [typeId] : []}
              />
            </div>
            <div className={FIELD_LABEL_CLASS}>
              <span>Categoria</span>
              <SearchSelect
                compact
                disabled={saving}
                onChange={(values) => void changeCategory(values[0] ?? '')}
                options={selectOptions(createCatalogs?.categories ?? [])}
                placeholder="Selecione a categoria"
                searchPlaceholder="Pesquisar categoria..."
                value={categoryId ? [categoryId] : []}
              />
            </div>
            <div className={FIELD_LABEL_CLASS}>
              <span>Subcategoria</span>
              <SearchSelect
                allowClear={false}
                compact
                disabled={saving || !categoryId}
                onChange={(values) => void changeSubcategory(values[0] ?? '0')}
                options={selectOptions(
                  subcategories.filter((option) => option.id > 0),
                  [{ value: '0', label: 'Não informado' }],
                )}
                placeholder="Não informado"
                searchPlaceholder="Pesquisar subcategoria..."
                value={[subcategoryId]}
              />
            </div>
            <div className={FIELD_LABEL_CLASS}>
              <span>Item</span>
              <SearchSelect
                allowClear={false}
                compact
                disabled={saving || subcategoryId === '0'}
                onChange={(values) => setItemId(values[0] ?? '0')}
                options={selectOptions(
                  items.filter((option) => option.id > 0),
                  [{ value: '0', label: 'Não informado' }],
                )}
                placeholder="Não informado"
                searchPlaceholder="Pesquisar item..."
                value={[itemId]}
              />
            </div>
            <div className={FIELD_LABEL_CLASS}>
              <span>Nível</span>
              <SearchSelect
                allowClear={false}
                compact
                disabled={saving}
                onChange={(values) => setLevelId(values[0] ?? levelId)}
                options={selectOptions(createCatalogs?.levels ?? [])}
                placeholder="Selecione o nível"
                searchable={false}
                value={levelId ? [levelId] : []}
              />
            </div>
            <div className={FIELD_LABEL_CLASS}>
              <span>Prioridade</span>
              <SearchSelect
                allowClear={false}
                compact
                disabled={saving}
                onChange={(values) => setPriorityId(values[0] ?? priorityId)}
                options={selectOptions(createCatalogs?.priorities ?? [])}
                placeholder="Selecione a prioridade"
                searchable={false}
                value={priorityId ? [priorityId] : []}
              />
            </div>
            <div className={FIELD_LABEL_CLASS}>
              <span>Forma</span>
              <SearchSelect
                allowClear={false}
                compact
                disabled={saving}
                onChange={(values) => setFormId(values[0] ?? formId)}
                options={selectOptions(createCatalogs?.forms ?? [])}
                placeholder="Selecione a forma"
                searchable={false}
                value={formId ? [formId] : []}
              />
            </div>
            <div className={FIELD_LABEL_CLASS}>
              <span>Técnico</span>
              <SearchSelect
                allowClear={false}
                compact
                disabled={saving}
                onChange={(values) => setTechnicianId(values[0] ?? '0')}
                options={selectOptions(createCatalogs?.technicians ?? [])}
                placeholder="Não determinado"
                searchPlaceholder="Pesquisar técnico..."
                value={technicianId ? [technicianId] : []}
              />
            </div>
            <label className={FIELD_LABEL_CLASS}>
              Abertura
              <input
                className={FIELD_CONTROL_CLASS}
                disabled={saving}
                onChange={(event) => setOpeningAt(event.target.value)}
                required
                type="datetime-local"
                value={openingAt}
              />
            </label>
            <label className={FIELD_LABEL_CLASS}>
              <span>Nome da máquina <span className="font-medium text-app-subtle">(opcional)</span></span>
              <input
                className={FIELD_CONTROL_CLASS}
                disabled={saving}
                maxLength={255}
                onChange={(event) => setMachineName(event.target.value)}
                placeholder="Ex.: NTB-FIN-01"
                type="text"
                value={machineName}
              />
            </label>
            <label className={`${FIELD_LABEL_CLASS} sm:col-span-2 xl:col-span-2`}>
              <span className="flex items-center justify-between gap-3">
                <span>Descrição de abertura</span>
                <small className="font-medium text-app-subtle">{description.length}/10000</small>
              </span>
              <textarea
                className={TEXTAREA_CLASS}
                disabled={saving}
                maxLength={10000}
                onChange={(event) => setDescription(event.target.value)}
                required
                rows={3}
                value={description}
              />
            </label>
          </div>

          <section
            className={[
              'mt-3 overflow-visible rounded-xl border transition-colors',
              recurring
                ? 'border-app-brand/40 bg-app-brand-soft/30'
                : 'border-app-border bg-app-surface-muted/65',
            ].join(' ')}
          >
            <button
              aria-expanded={recurring}
              className="flex w-full items-center justify-between gap-4 rounded-xl px-3.5 py-3 text-left transition hover:bg-app-surface-hover/60"
              disabled={saving}
              onClick={() => setRecurring((current) => !current)}
              type="button"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={[
                    'grid size-9 shrink-0 place-items-center rounded-lg border',
                    recurring
                      ? 'border-app-brand/35 bg-app-brand text-app-brand-contrast'
                      : 'border-app-border bg-app-surface text-app-muted',
                  ].join(' ')}
                >
                  <svg aria-hidden="true" className="size-[18px]" fill="none" viewBox="0 0 24 24">
                    <path d="M7 3v3M17 3v3M4 9h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                    <rect height="17" rx="3" stroke="currentColor" strokeWidth="1.8" width="18" x="3" y="4" />
                    <path d="M8 14h3l-1.5-1.5M16 16h-3l1.5 1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm text-app-text">Atendimento recorrente</strong>
                  <small className="mt-0.5 block text-[11px] leading-relaxed text-app-muted">
                    Reabra este atendimento automaticamente seguindo uma periodicidade.
                  </small>
                </span>
              </span>

              <span
                aria-hidden="true"
                className={[
                  'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
                  recurring
                    ? 'border-app-brand bg-app-brand'
                    : 'border-app-border-strong bg-app-surface',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform',
                    recurring ? 'translate-x-[20px]' : 'translate-x-0.5',
                  ].join(' ')}
                />
              </span>
            </button>

            {recurring ? (
              <div className="border-t border-app-brand/20 px-3.5 pb-3.5 pt-3">
                <div className="mb-2.5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.05em] text-app-muted">
                  <span className="h-px flex-1 bg-app-border-soft" />
                  Configuração da recorrência
                  <span className="h-px flex-1 bg-app-border-soft" />
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  <label className={FIELD_LABEL_CLASS}>
                    Primeira reabertura
                    <input
                      className={FIELD_CONTROL_CLASS}
                      disabled={saving}
                      onChange={(event) => setRecurrenceAt(event.target.value)}
                      required
                      type="datetime-local"
                      value={recurrenceAt}
                    />
                  </label>

                  <div className={FIELD_LABEL_CLASS}>
                    <span>Periodicidade</span>
                    <SearchSelect
                      allowClear={false}
                      compact
                      disabled={saving}
                      onChange={(values) => setRecurrenceRule(values[0] ?? recurrenceRule)}
                      options={selectOptions(createCatalogs?.recurrenceRules ?? [])}
                      placeholder="Selecione a periodicidade"
                      searchable={false}
                      value={recurrenceRule ? [recurrenceRule] : []}
                    />
                  </div>

                  <label className={FIELD_LABEL_CLASS}>
                    <span className="flex items-center justify-between gap-2">
                      <span>Quantidade</span>
                      <small className="font-medium text-app-subtle">máx. 12</small>
                    </span>
                    <div className="relative">
                      <input
                        className={`${FIELD_CONTROL_CLASS} pr-20`}
                        disabled={saving}
                        max={12}
                        min={1}
                        onChange={(event) => setRemaining(event.target.value)}
                        required
                        type="number"
                        value={remaining}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-app-subtle">
                        ocorrências
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            ) : null}
          </section>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-app-border-soft pt-3">
            <p className="m-0 text-xs text-app-muted">
              Revise os dados antes de salvar. Após o cadastro, o atendimento será aberto no detalhe.
            </p>
            <div className="flex flex-wrap justify-end gap-2 max-sm:w-full max-sm:[&>*]:flex-1">
              <button
                className={BUTTON_CLASS}
                disabled={saving}
                onClick={resetForm}
                type="button"
              >
                Limpar
              </button>
              <Link className={BUTTON_CLASS} href="/atendimentos">
                Cancelar
              </Link>
              <button
                className={PRIMARY_BUTTON_CLASS}
                disabled={saving || loading || !canSubmit}
                type="submit"
              >
                {saving ? 'Cadastrando…' : 'Cadastrar atendimento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

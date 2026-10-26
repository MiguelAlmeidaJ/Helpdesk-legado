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

function nextBusinessDayAtEight(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  date.setHours(8, 0, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

type CreationMode = 'now' | 'scheduled' | 'recurring';
type CreationStep = 'choose' | 'configure' | 'form';

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
  const [mode, setMode] = useState<CreationMode | null>(null);
  const [step, setStep] = useState<CreationStep>('choose');
  const recurring = mode === 'recurring';
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
      (mode === 'now' || Boolean(openingAt)) &&
      description.trim() &&
      (!recurring || (Boolean(recurrenceAt) && Number(remaining) >= 1 && Number(remaining) <= 12)),
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
    setMode(null);
    setStep('choose');
    setRecurrenceAt('');
    setRecurrenceRule('2');
    setRemaining('1');
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode || step !== 'form') return;
    if (mode === 'scheduled' && new Date(openingAt).getTime() <= Date.now()) {
      setError('Selecione uma data e hora futuras para agendar o chamado.');
      return;
    }
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
        openingAt: mode === 'now' ? localDateTime() : openingAt,
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

        {step === 'choose' ? (
          <section className="rounded-2xl border border-app-border bg-app-surface p-6 shadow-sm">
            <h2 className="m-0 text-xl font-bold">Como deseja abrir o chamado?</h2>
            <p className="mt-1 text-sm text-app-muted">Escolha uma das opções para continuar.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {([
                ['now', 'Abrir Chamado Agora', 'Cadastre e abra o chamado imediatamente.'],
                ['scheduled', 'Agendar Chamado', 'Escolha a data e a hora de abertura.'],
                ['recurring', 'Criar Chamado Recorrente', 'Configure a repetição antes de preencher o chamado.'],
              ] as const).map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  className="rounded-xl border border-app-border-strong bg-app-surface p-5 text-left transition hover:border-app-brand hover:bg-app-brand-soft focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--app-brand-ring)]"
                  onClick={() => {
                    setMode(value);
                    setError(null);
                    if (value === 'now') {
                      setOpeningAt(localDateTime());
                      setStep('form');
                    } else {
                      if (value === 'scheduled') setOpeningAt(nextBusinessDayAtEight());
                      if (value === 'recurring') {
                        setOpeningAt(localDateTime());
                        setRecurrenceAt(nextBusinessDayAtEight());
                      }
                      setStep('configure');
                    }
                  }}
                >
                  <strong className="block text-base text-app-text">{label}</strong>
                  <span className="mt-2 block text-sm leading-relaxed text-app-muted">{description}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {step === 'configure' && mode ? (
          <section className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm">
            <h2 className="m-0 text-lg font-bold">
              {mode === 'scheduled' ? 'Quando o chamado deve ser aberto?' : 'Configure a recorrência'}
            </h2>
            {mode === 'scheduled' ? (
              <div className="mt-4 grid max-w-xl gap-3">
                <label className={FIELD_LABEL_CLASS}>
                  Data e hora da abertura
                  <input
                    className={FIELD_CONTROL_CLASS}
                    type="datetime-local"
                    min={localDateTime()}
                    required
                    value={openingAt}
                    onChange={(event) => setOpeningAt(event.target.value)}
                  />
                </label>
                <button className={BUTTON_CLASS} type="button" onClick={() => setOpeningAt(nextBusinessDayAtEight())}>
                  Próximo dia útil às 8h
                </button>
                <p className="m-0 text-xs text-app-muted">Dias úteis: segunda a sexta-feira, sem considerar feriados.</p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <label className={FIELD_LABEL_CLASS}>
                  Primeira reabertura
                  <input
                    className={FIELD_CONTROL_CLASS}
                    type="datetime-local"
                    min={localDateTime()}
                    required
                    value={recurrenceAt}
                    onChange={(event) => setRecurrenceAt(event.target.value)}
                  />
                </label>
                <div className={FIELD_LABEL_CLASS}>
                  <span>Periodicidade</span>
                  <SearchSelect
                    allowClear={false}
                    compact
                    options={selectOptions(createCatalogs?.recurrenceRules ?? [])}
                    value={[recurrenceRule]}
                    onChange={(values) => setRecurrenceRule(values[0] ?? recurrenceRule)}
                    searchable={false}
                  />
                </div>
                <label className={FIELD_LABEL_CLASS}>
                  Quantidade de ocorrências (máx. 12)
                  <input
                    className={FIELD_CONTROL_CLASS}
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={remaining}
                    onChange={(event) => setRemaining(event.target.value)}
                  />
                </label>
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className={BUTTON_CLASS} onClick={() => { setStep('choose'); setError(null); }}>
                Voltar
              </button>
              <button
                type="button"
                className={PRIMARY_BUTTON_CLASS}
                disabled={
                  mode === 'scheduled'
                    ? !openingAt || new Date(openingAt).getTime() <= Date.now()
                    : !recurrenceAt || new Date(recurrenceAt).getTime() <= Date.now() ||
                      !recurrenceRule || !Number.isInteger(Number(remaining)) ||
                      Number(remaining) < 1 || Number(remaining) > 12
                }
                onClick={() => { setError(null); setStep('form'); }}
              >
                Continuar para o formulário
              </button>
            </div>
          </section>
        ) : null}

        {step === 'form' ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3">
            <div>
              <strong className="text-sm">
                {mode === 'now' ? 'Abertura imediata' : mode === 'scheduled' ? 'Chamado agendado' : 'Chamado recorrente'}
              </strong>
              <p className="m-0 mt-1 text-xs text-app-muted">
                {mode === 'now' ? 'A data de abertura será registrada ao cadastrar.' :
                  mode === 'scheduled' ? `Abertura programada: ${new Date(openingAt).toLocaleString('pt-BR')}` :
                  `Primeira reabertura: ${new Date(recurrenceAt).toLocaleString('pt-BR')}`}
              </p>
            </div>
            <button className={BUTTON_CLASS} type="button" disabled={saving} onClick={() => setStep(mode === 'now' ? 'choose' : 'configure')}>
              Alterar opção
            </button>
          </div>
        ) : null}

        {step === 'form' ? (
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
        ) : null}
      </div>
    </main>
  );
}

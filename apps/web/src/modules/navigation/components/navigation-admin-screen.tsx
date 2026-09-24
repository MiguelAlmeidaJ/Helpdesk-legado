"use client";

import {
  AppPermission,
  NAVIGATION_ICON_NAMES,
  UserRole,
  type CurrentUserResponse,
  type NavigationAdminItem,
  type NavigationAdminItemInput,
  type NavigationAdminResponse,
  type NavigationAdminSection,
  type NavigationAdminSectionInput,
  type NavigationIconName,
  type NavigationVisibilityCondition,
} from '@helpdesk/contracts';
import Link from 'next/link';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { NavigationIcon } from '../../../shared/navigation/navigation-icon';
import {
  createNavigationItem,
  createNavigationSection,
  fetchNavigationAdmin,
  updateNavigationItem,
  updateNavigationSection,
} from '../api/navigation-admin-api';

interface SectionForm {
  slug: string;
  label: string;
  shortLabel: string;
  icon: string;
  sortOrder: string;
  active: boolean;
}

interface ItemForm {
  sectionId: string;
  slug: string;
  label: string;
  icon: string;
  href: string;
  status: 'available' | 'planned';
  sortOrder: string;
  active: boolean;
  anyPermissions: string[];
  allPermissions: string[];
  anyRoles: string[];
}

const EMPTY_SECTION: SectionForm = {
  slug: '',
  label: '',
  shortLabel: '',
  icon: '',
  sortOrder: '0',
  active: true,
};

const EMPTY_ITEM: ItemForm = {
  sectionId: '',
  slug: '',
  label: '',
  icon: '',
  href: '',
  status: 'planned',
  sortOrder: '0',
  active: true,
  anyPermissions: [],
  allPermissions: [],
  anyRoles: [],
};

const PERMISSION_OPTIONS = Object.values(AppPermission).sort();
const ROLE_OPTIONS = Object.values(UserRole).sort();
const ICON_LABELS: Record<NavigationIconName, string> = {
  home: 'Início',
  headset: 'Atendimento',
  code: 'Código / DevOps',
  megaphone: 'Marketing',
  truck: 'Logística',
  chart: 'Relatórios / Gráfico',
  database: 'Cadastros / Banco',
  radio: 'Rádio',
  wallet: 'Carteira / Financeiro',
  settings: 'Configurações',
  shield: 'Segurança',
  users: 'Usuários',
  menu: 'Menu',
  wrench: 'Manutenção',
  clock: 'Relógio / Agenda',
  file: 'Arquivo',
  folder: 'Pasta',
  building: 'Empresa',
  list: 'Lista',
  grid: 'Grade',
};

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] border border-app-border-strong bg-app-surface px-4 font-bold text-app-text-soft no-underline transition-colors hover:bg-app-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-brand disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] border border-app-brand bg-app-brand px-4 font-bold text-white no-underline transition-colors hover:bg-app-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-brand disabled:cursor-not-allowed disabled:opacity-50';
const CARD_CLASS =
  'rounded-2xl border border-app-border bg-app-surface p-[18px] shadow-sm';
const CARD_TITLE_CLASS =
  'mb-4 flex items-center justify-between gap-3';
const CARD_KICKER_CLASS = 'text-[0.78rem] text-app-muted';
const CARD_HEADING_CLASS = 'text-[1.05rem] font-bold';
const LIST_CLASS = 'grid gap-2';
const LIST_BUTTON_CLASS =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-app-border bg-app-surface px-3 py-[11px] text-left transition-colors hover:bg-app-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-brand data-[active=true]:border-app-muted data-[active=true]:bg-app-surface-muted';
const FIELD_CLASS =
  'grid gap-1.5 text-[0.82rem] font-semibold text-app-text-soft';
const CONTROL_CLASS =
  'w-full rounded-[10px] border border-app-border-strong bg-app-surface px-[11px] py-2.5 text-app-text outline-none transition-colors focus:border-app-brand focus:ring-2 focus:ring-app-brand disabled:cursor-not-allowed disabled:bg-app-surface-muted disabled:text-app-subtle';
const MULTI_SELECT_CLASS =
  'min-h-[150px] w-full rounded-[10px] border border-app-border-strong bg-app-surface px-[11px] py-2.5 text-app-text outline-none transition-colors focus:border-app-brand focus:ring-2 focus:ring-app-brand';

function fromSection(section: NavigationAdminSection): SectionForm {
  return {
    slug: section.slug,
    label: section.label,
    shortLabel: section.shortLabel ?? '',
    icon: section.icon ?? '',
    sortOrder: String(section.sortOrder),
    active: section.active,
  };
}

function fromItem(item: NavigationAdminItem): ItemForm {
  return {
    sectionId: String(item.sectionId),
    slug: item.slug,
    label: item.label,
    icon: item.icon ?? '',
    href: item.href ?? '',
    status: item.status,
    sortOrder: String(item.sortOrder),
    active: item.active,
    anyPermissions: item.visibilityCondition?.anyPermissions ?? [],
    allPermissions: item.visibilityCondition?.allPermissions ?? [],
    anyRoles: item.visibilityCondition?.anyRoles ?? [],
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status >= 500) return 'Não foi possível carregar ou salvar a navegação. Tente novamente.';
    if (error.body && typeof error.body === 'object') {
      const value = (error.body as Record<string, unknown>).message;
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.join(' ');
    }
    if (error.status === 403) return 'Somente administradores globais podem alterar o menu.';
    return `A API respondeu com erro ${error.status}.`;
  }
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
}

function selectedValues(event: ChangeEvent<HTMLSelectElement>): string[] {
  return Array.from(event.currentTarget.selectedOptions, (option) => option.value);
}

function visibility(form: ItemForm): NavigationVisibilityCondition | null {
  if (
    form.anyPermissions.length === 0 &&
    form.allPermissions.length === 0 &&
    form.anyRoles.length === 0
  ) {
    return null;
  }

  return {
    anyPermissions: form.anyPermissions,
    allPermissions: form.allPermissions,
    anyRoles: form.anyRoles,
  };
}

function sectionInput(form: SectionForm): NavigationAdminSectionInput {
  return {
    slug: form.slug.trim(),
    label: form.label.trim(),
    shortLabel: form.shortLabel.trim() || null,
    icon: (form.icon || null) as NavigationIconName | null,
    sortOrder: Number(form.sortOrder),
    active: form.active,
  };
}

function itemInput(form: ItemForm): NavigationAdminItemInput {
  return {
    sectionId: Number(form.sectionId),
    slug: form.slug.trim(),
    label: form.label.trim(),
    icon: (form.icon || null) as NavigationIconName | null,
    href: form.href.trim() || null,
    status: form.status,
    visibilityCondition: visibility(form),
    sortOrder: Number(form.sortOrder),
    active: form.active,
  };
}

export function NavigationAdminScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [data, setData] = useState<NavigationAdminResponse | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionForm>(EMPTY_SECTION);
  const [itemForm, setItemForm] = useState<ItemForm>(EMPTY_ITEM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedSection = useMemo(
    () => data?.sections.find((section) => section.id === selectedSectionId) ?? null,
    [data, selectedSectionId],
  );
  const selectedItem = useMemo(
    () =>
      data?.sections
        .flatMap((section) => section.items)
        .find((item) => item.id === selectedItemId) ?? null,
    [data, selectedItemId],
  );

  async function load(signal?: AbortSignal): Promise<NavigationAdminResponse | null> {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchNavigationAdmin(signal);
      setData(next);
      setSelectedSectionId((current) =>
        current && next.sections.some((section) => section.id === current)
          ? current
          : next.sections[0]?.id ?? null,
      );
      setSelectedItemId((current) =>
        current && next.sections.some((section) => section.items.some((item) => item.id === current))
          ? current
          : null,
      );
      return next;
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return null;
      setError(errorMessage(reason));
      return null;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (selectedSection) setSectionForm(fromSection(selectedSection));
  }, [selectedSection]);

  useEffect(() => {
    if (selectedItem) setItemForm(fromItem(selectedItem));
  }, [selectedItem]);

  function selectSection(section: NavigationAdminSection) {
    setSelectedSectionId(section.id);
    setSelectedItemId(null);
    setSectionForm(fromSection(section));
    setError(null);
    setSuccess(null);
  }

  function newSection() {
    setSelectedSectionId(null);
    setSelectedItemId(null);
    setSectionForm({
      ...EMPTY_SECTION,
      sortOrder: String((data?.sections.at(-1)?.sortOrder ?? -10) + 10),
    });
    setItemForm(EMPTY_ITEM);
    setError(null);
    setSuccess(null);
  }

  function selectItem(item: NavigationAdminItem) {
    setSelectedSectionId(item.sectionId);
    setSelectedItemId(item.id);
    setItemForm(fromItem(item));
    setError(null);
    setSuccess(null);
  }

  function newItem() {
    if (!selectedSectionId) return;
    const items = selectedSection?.items ?? [];
    setSelectedItemId(null);
    setItemForm({
      ...EMPTY_ITEM,
      sectionId: String(selectedSectionId),
      sortOrder: String((items.at(-1)?.sortOrder ?? -10) + 10),
    });
    setError(null);
    setSuccess(null);
  }

  async function saveSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = selectedSectionId
        ? await updateNavigationSection(selectedSectionId, sectionInput(sectionForm))
        : await createNavigationSection(sectionInput(sectionForm));
      setSelectedSectionId(saved.id);
      setSelectedItemId(null);
      await load();
      setSuccess('Seção salva com sucesso.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = selectedItemId
        ? await updateNavigationItem(selectedItemId, itemInput(itemForm))
        : await createNavigationItem(itemInput(itemForm));
      setSelectedSectionId(Number(itemForm.sectionId));
      setSelectedItemId(saved.id);
      await load();
      setSuccess('Item salvo com sucesso.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen">
      <AppPageHeader
        actions={
          <button
            className={PRIMARY_BUTTON_CLASS}
            onClick={newSection}
            type="button"
          >
            Nova seção
          </button>
        }
        subtitle="Organize seções, páginas, ordem e visibilidade do menu lateral."
        title="Navegação"
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1500px] p-6 max-[760px]:px-3.5">

        {error ? (
          <div
            className="mb-4 rounded-[10px] border border-app-danger-border bg-app-danger-soft px-[13px] py-[11px] text-app-danger"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        {success ? (
          <div
            className="mb-4 rounded-[10px] border border-app-success bg-app-success-soft px-[13px] py-[11px] text-app-success"
            role="status"
          >
            {success}
          </div>
        ) : null}

        <div className="grid grid-cols-[minmax(260px,340px)_minmax(0,1fr)] items-start gap-5 max-[960px]:grid-cols-1">
          <section className={`${CARD_CLASS} sticky top-5 max-[960px]:static`}>
            <div className={CARD_TITLE_CLASS}>
              <div className="grid gap-0.5">
                <span className={CARD_KICKER_CLASS}>Estrutura</span>
                <strong className={CARD_HEADING_CLASS}>Seções</strong>
              </div>
              <small className={CARD_KICKER_CLASS}>
                {data?.sections.length ?? 0} cadastradas
              </small>
            </div>
            {loading && !data ? (
              <p className="text-sm text-app-muted">Carregando…</p>
            ) : null}
            <div className={LIST_CLASS}>
              {data?.sections.map((section) => (
                <button
                  aria-pressed={selectedSectionId === section.id}
                  className={LIST_BUTTON_CLASS}
                  data-active={selectedSectionId === section.id}
                  key={section.id}
                  onClick={() => selectSection(section)}
                  type="button"
                >
                  <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-app-surface-muted text-app-text-soft">
                    {section.icon ? <NavigationIcon className="size-[18px]" name={section.icon} /> : <span className="text-[0.76rem] font-bold">{section.shortLabel || '—'}</span>}
                  </span>
                  <span className="grid min-w-0 flex-1 gap-[3px]">
                    <strong>{section.label}</strong>
                    <small className="[overflow-wrap:anywhere] text-app-muted">
                      {section.slug} · ordem {section.sortOrder}
                    </small>
                  </span>
                  <em
                    className="text-[0.72rem] not-italic text-app-muted data-[active=true]:text-app-success"
                    data-active={section.active}
                  >
                    {section.active ? 'Ativa' : 'Inativa'}
                  </em>
                </button>
              ))}
            </div>
          </section>

          <div className="grid gap-5">
            <section className={CARD_CLASS}>
              <div className={CARD_TITLE_CLASS}>
                <div className="grid gap-0.5">
                  <span className={CARD_KICKER_CLASS}>Seção</span>
                  <strong className={CARD_HEADING_CLASS}>
                    {selectedSectionId ? `Editar #${selectedSectionId}` : 'Nova seção'}
                  </strong>
                </div>
              </div>
              <form className="grid gap-4" onSubmit={saveSection}>
                <div className="grid grid-cols-2 gap-3.5 max-[640px]:grid-cols-1">
                  <label className={FIELD_CLASS}>
                    <span>Identificador</span>
                    <input
                      className={CONTROL_CLASS}
                      disabled={selectedSectionId !== null}
                      maxLength={100}
                      onChange={(event) =>
                        setSectionForm({ ...sectionForm, slug: event.target.value })
                      }
                      pattern="[a-z0-9][a-z0-9-]*"
                      required
                      value={sectionForm.slug}
                    />
                  </label>
                  <label className={FIELD_CLASS}>
                    <span>Nome</span>
                    <input
                      className={CONTROL_CLASS}
                      maxLength={150}
                      onChange={(event) =>
                        setSectionForm({ ...sectionForm, label: event.target.value })
                      }
                      required
                      value={sectionForm.label}
                    />
                  </label>
                  <label className={FIELD_CLASS}>
                    <span>Sigla</span>
                    <input
                      className={CONTROL_CLASS}
                      maxLength={20}
                      onChange={(event) =>
                        setSectionForm({
                          ...sectionForm,
                          shortLabel: event.target.value,
                        })
                      }
                      value={sectionForm.shortLabel}
                    />
                  </label>
                  <label className={FIELD_CLASS}>
                    <span>Ícone</span>
                    <span className="grid grid-cols-[42px_minmax(0,1fr)] gap-2">
                      <span className="grid size-[42px] place-items-center rounded-[10px] border border-app-border bg-app-surface-muted text-app-text-soft">
                        <NavigationIcon className="size-5" name={(sectionForm.icon || null) as NavigationIconName | null} />
                      </span>
                      <select
                        className={CONTROL_CLASS}
                        onChange={(event) => setSectionForm({ ...sectionForm, icon: event.target.value })}
                        value={sectionForm.icon}
                      >
                        <option value="">Sem ícone</option>
                        {NAVIGATION_ICON_NAMES.map((icon) => <option key={icon} value={icon}>{ICON_LABELS[icon]}</option>)}
                      </select>
                    </span>
                  </label>
                  <label className={FIELD_CLASS}>
                    <span>Ordem</span>
                    <input
                      className={CONTROL_CLASS}
                      min={0}
                      onChange={(event) =>
                        setSectionForm({
                          ...sectionForm,
                          sortOrder: event.target.value,
                        })
                      }
                      required
                      type="number"
                      value={sectionForm.sortOrder}
                    />
                  </label>
                </div>
                <label className="flex items-center gap-[9px] text-[0.82rem] font-semibold text-app-text-soft">
                  <input
                    className="h-4 w-4 accent-app-brand"
                    checked={sectionForm.active}
                    onChange={(event) =>
                      setSectionForm({ ...sectionForm, active: event.target.checked })
                    }
                    type="checkbox"
                  />
                  <span>Seção ativa no menu</span>
                </label>
                <div className="flex justify-end">
                  <button
                    className={PRIMARY_BUTTON_CLASS}
                    disabled={saving}
                    type="submit"
                  >
                    {saving ? 'Salvando…' : 'Salvar seção'}
                  </button>
                </div>
              </form>
            </section>

            <section className={CARD_CLASS}>
              <div className={CARD_TITLE_CLASS}>
                <div className="grid gap-0.5">
                  <span className={CARD_KICKER_CLASS}>Páginas</span>
                  <strong className={CARD_HEADING_CLASS}>Itens da seção</strong>
                </div>
                <button
                  className={BUTTON_CLASS}
                  disabled={!selectedSectionId}
                  onClick={newItem}
                  type="button"
                >
                  Novo item
                </button>
              </div>
              {!selectedSectionId ? (
                <p className="text-sm text-app-muted">
                  Salve ou selecione uma seção para gerenciar seus itens.
                </p>
              ) : (
                <>
                  <div className={LIST_CLASS}>
                    {selectedSection?.items.map((item) => (
                      <button
                        aria-pressed={selectedItemId === item.id}
                        className={LIST_BUTTON_CLASS}
                        data-active={selectedItemId === item.id}
                        key={item.id}
                        onClick={() => selectItem(item)}
                        type="button"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-app-surface-muted text-app-muted">
                          <NavigationIcon className="size-4" name={item.icon ?? selectedSection?.icon} />
                        </span>
                        <span className="grid min-w-0 flex-1 gap-[3px]">
                          <strong>{item.label}</strong>
                          <small className="[overflow-wrap:anywhere] text-app-muted">
                            {item.href || 'Sem rota'} · ordem {item.sortOrder}
                          </small>
                        </span>
                        <em
                          className="text-[0.72rem] not-italic text-app-muted data-[active=true]:text-app-success"
                          data-active={item.active}
                        >
                          {item.active ? item.status : 'inativo'}
                        </em>
                      </button>
                    ))}
                    {selectedSection?.items.length === 0 ? (
                      <p className="text-sm text-app-muted">Nenhum item nesta seção.</p>
                    ) : null}
                  </div>

                  {selectedItemId !== null || itemForm.sectionId ? (
                    <form className="mt-4 grid gap-4" onSubmit={saveItem}>
                      <div className="grid grid-cols-2 gap-3.5 max-[640px]:grid-cols-1">
                        <label className={FIELD_CLASS}>
                          <span>Seção</span>
                          <select
                            className={CONTROL_CLASS}
                            onChange={(event) =>
                              setItemForm({
                                ...itemForm,
                                sectionId: event.target.value,
                              })
                            }
                            required
                            value={itemForm.sectionId}
                          >
                            {data?.sections.map((section) => (
                              <option key={section.id} value={section.id}>
                                {section.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={FIELD_CLASS}>
                          <span>Identificador</span>
                          <input
                            className={CONTROL_CLASS}
                            disabled={selectedItemId !== null}
                            maxLength={120}
                            onChange={(event) =>
                              setItemForm({ ...itemForm, slug: event.target.value })
                            }
                            pattern="[a-z0-9][a-z0-9-]*"
                            required
                            value={itemForm.slug}
                          />
                        </label>
                        <label className={FIELD_CLASS}>
                          <span>Nome</span>
                          <input
                            className={CONTROL_CLASS}
                            maxLength={160}
                            onChange={(event) =>
                              setItemForm({ ...itemForm, label: event.target.value })
                            }
                            required
                            value={itemForm.label}
                          />
                        </label>
                        <label className={FIELD_CLASS}>
                          <span>Ícone</span>
                          <span className="grid grid-cols-[42px_minmax(0,1fr)] gap-2">
                            <span className="grid size-[42px] place-items-center rounded-[10px] border border-app-border bg-app-surface-muted text-app-text-soft">
                              <NavigationIcon className="size-5" name={(itemForm.icon || selectedSection?.icon || null) as NavigationIconName | null} />
                            </span>
                            <select
                              className={CONTROL_CLASS}
                              onChange={(event) => setItemForm({ ...itemForm, icon: event.target.value })}
                              value={itemForm.icon}
                            >
                              <option value="">Herdar da seção</option>
                              {NAVIGATION_ICON_NAMES.map((icon) => <option key={icon} value={icon}>{ICON_LABELS[icon]}</option>)}
                            </select>
                          </span>
                        </label>
                        <label className={FIELD_CLASS}>
                          <span>Rota</span>
                          <input
                            className={CONTROL_CLASS}
                            maxLength={500}
                            onChange={(event) =>
                              setItemForm({ ...itemForm, href: event.target.value })
                            }
                            placeholder="/exemplo"
                            required={itemForm.status === 'available'}
                            value={itemForm.href}
                          />
                        </label>
                        <label className={FIELD_CLASS}>
                          <span>Status</span>
                          <select
                            className={CONTROL_CLASS}
                            onChange={(event) =>
                              setItemForm({
                                ...itemForm,
                                status: event.target.value as 'available' | 'planned',
                              })
                            }
                            value={itemForm.status}
                          >
                            <option value="available">Disponível</option>
                            <option value="planned">Em migração</option>
                          </select>
                        </label>
                        <label className={FIELD_CLASS}>
                          <span>Ordem</span>
                          <input
                            className={CONTROL_CLASS}
                            min={0}
                            onChange={(event) =>
                              setItemForm({
                                ...itemForm,
                                sortOrder: event.target.value,
                              })
                            }
                            required
                            type="number"
                            value={itemForm.sortOrder}
                          />
                        </label>
                      </div>

                      <label className="flex items-center gap-[9px] text-[0.82rem] font-semibold text-app-text-soft">
                        <input
                          className="h-4 w-4 accent-app-brand"
                          checked={itemForm.active}
                          onChange={(event) =>
                            setItemForm({ ...itemForm, active: event.target.checked })
                          }
                          type="checkbox"
                        />
                        <span>Item ativo no menu</span>
                      </label>

                      <fieldset className="rounded-xl border border-app-border p-3.5">
                        <legend className="px-1.5 font-bold">Visibilidade</legend>
                        <p className="mt-0 mb-3 text-[0.82rem] text-app-muted">
                          Grupos diferentes são combinados com AND. Dentro de “qualquer”, basta uma correspondência.
                        </p>
                        <div className="grid grid-cols-3 gap-3 max-[960px]:grid-cols-1">
                          <label className={FIELD_CLASS}>
                            <span>Qualquer permissão</span>
                            <select
                              className={MULTI_SELECT_CLASS}
                              multiple
                              onChange={(event) =>
                                setItemForm({
                                  ...itemForm,
                                  anyPermissions: selectedValues(event),
                                })
                              }
                              value={itemForm.anyPermissions}
                            >
                              {PERMISSION_OPTIONS.map((permission) => (
                                <option key={permission} value={permission}>
                                  {permission}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className={FIELD_CLASS}>
                            <span>Todas as permissões</span>
                            <select
                              className={MULTI_SELECT_CLASS}
                              multiple
                              onChange={(event) =>
                                setItemForm({
                                  ...itemForm,
                                  allPermissions: selectedValues(event),
                                })
                              }
                              value={itemForm.allPermissions}
                            >
                              {PERMISSION_OPTIONS.map((permission) => (
                                <option key={permission} value={permission}>
                                  {permission}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className={FIELD_CLASS}>
                            <span>Qualquer role</span>
                            <select
                              className={MULTI_SELECT_CLASS}
                              multiple
                              onChange={(event) =>
                                setItemForm({
                                  ...itemForm,
                                  anyRoles: selectedValues(event),
                                })
                              }
                              value={itemForm.anyRoles}
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </fieldset>

                      <div className="flex justify-end">
                        <button
                          className={PRIMARY_BUTTON_CLASS}
                          disabled={saving}
                          type="submit"
                        >
                          {saving ? 'Salvando…' : 'Salvar item'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="mt-4 text-sm text-app-muted">
                      Selecione um item ou clique em “Novo item”.
                    </p>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

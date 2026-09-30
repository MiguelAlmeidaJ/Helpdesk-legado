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
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { NavigationIcon } from '../../../shared/navigation/navigation-icon';
import { appButtonClass } from '../../../shared/ui/button-styles';
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
  status: 'available',
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
  wallet: 'Financeiro',
  settings: 'Configurações',
  shield: 'Segurança',
  users: 'Usuários',
  menu: 'Menu',
  wrench: 'Manutenção',
  clock: 'Agenda',
  file: 'Arquivo',
  folder: 'Pasta',
  building: 'Empresa',
  list: 'Lista',
  grid: 'Grade',
};

const PRIMARY = appButtonClass('primary');
const SECONDARY = appButtonClass('secondary');
const FIELD =
  'grid gap-1.5 text-[0.82rem] font-semibold text-app-text-soft';
const CONTROL =
  'min-h-10 w-full rounded-xl border border-app-border-strong bg-app-surface px-3 py-2 text-sm text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:bg-app-surface-muted disabled:text-app-subtle';

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return 'Seu usuário não possui permissão para administrar a navegação.';
    }
    if (error.status >= 500) {
      return 'A API de navegação não respondeu corretamente. Verifique o serviço da API e tente novamente.';
    }
    if (error.body && typeof error.body === 'object') {
      const value = (error.body as Record<string, unknown>).message;
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.join(' ');
    }
    return `A API respondeu com erro ${error.status}.`;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'A consulta da navegação demorou demais. Tente novamente.';
  }
  return error instanceof Error
    ? error.message
    : 'Não foi possível concluir a operação.';
}

function sectionForm(section: NavigationAdminSection): SectionForm {
  return {
    slug: section.slug,
    label: section.label,
    shortLabel: section.shortLabel ?? '',
    icon: section.icon ?? '',
    sortOrder: String(section.sortOrder),
    active: section.active,
  };
}

function itemForm(item: NavigationAdminItem): ItemForm {
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

function visibility(form: ItemForm): NavigationVisibilityCondition | null {
  if (
    !form.anyPermissions.length &&
    !form.allPermissions.length &&
    !form.anyRoles.length
  ) {
    return null;
  }
  return {
    anyPermissions: form.anyPermissions,
    allPermissions: form.allPermissions,
    anyRoles: form.anyRoles,
  };
}

function toSectionInput(form: SectionForm): NavigationAdminSectionInput {
  return {
    slug: form.slug.trim(),
    label: form.label.trim(),
    shortLabel: form.shortLabel.trim() || null,
    icon: (form.icon || null) as NavigationIconName | null,
    sortOrder: Number(form.sortOrder),
    active: form.active,
  };
}

function toItemInput(form: ItemForm): NavigationAdminItemInput {
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

function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"
      role="dialog"
    >
      <section className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-app-border bg-app-surface shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-app-border bg-app-surface px-5 py-4">
          <div>
            <h2 className="m-0 text-lg font-extrabold text-app-text">{title}</h2>
            <p className="m-0 mt-1 text-sm text-app-muted">{subtitle}</p>
          </div>
          <button
            aria-label="Fechar"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-app-border bg-app-surface text-xl text-app-muted hover:bg-app-surface-hover"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = value
    ? NAVIGATION_ICON_NAMES.find((icon) => icon === value) ?? null
    : null;

  return (
    <details className="group rounded-xl border border-app-border bg-app-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
        <span className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-app-surface-muted text-app-muted">
            <NavigationIcon className="size-5" name={selected} />
          </span>
          <span className="grid">
            <strong className="text-xs">
              {selected ? ICON_LABELS[selected] : 'Sem ícone'}
            </strong>
            <small className="text-[11px] text-app-muted">
              Clique para alterar
            </small>
          </span>
        </span>
        <span className="text-app-muted transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="grid max-h-64 grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 overflow-y-auto border-t border-app-border-soft p-2">
        <button
          aria-pressed={!value}
          className="grid min-h-16 place-items-center rounded-lg border border-app-border bg-app-surface p-2 text-xs font-bold text-app-muted hover:bg-app-surface-hover aria-pressed:border-app-brand aria-pressed:bg-app-brand-soft aria-pressed:text-app-brand"
          onClick={() => onChange('')}
          type="button"
        >
          Sem ícone
        </button>
        {NAVIGATION_ICON_NAMES.map((icon) => (
          <button
            aria-pressed={value === icon}
            className="grid min-h-16 place-items-center gap-1 rounded-lg border border-app-border bg-app-surface p-2 text-app-muted hover:bg-app-surface-hover aria-pressed:border-app-brand aria-pressed:bg-app-brand-soft aria-pressed:text-app-brand"
            key={icon}
            onClick={() => onChange(icon)}
            type="button"
          >
            <NavigationIcon className="size-5" name={icon} />
            <span className="max-w-full truncate text-[10px] font-bold">
              {ICON_LABELS[icon]}
            </span>
          </button>
        ))}
      </div>
    </details>
  );
}

function MultiChoice({
  title,
  values,
  options,
  onChange,
}: {
  title: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return options;
    return options.filter((option) =>
      option.toLocaleLowerCase('pt-BR').includes(normalized),
    );
  }, [options, query]);

  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong className="text-xs">{title}</strong>
        <span className="text-[11px] text-app-muted">{values.length} selecionada(s)</span>
      </div>
      <input
        className={CONTROL}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar…"
        type="search"
        value={query}
      />
      <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-app-border-soft">
        {visible.map((option) => {
          const checked = values.includes(option);
          return (
            <label
              className="flex cursor-pointer items-center gap-2 border-b border-app-border-soft px-2.5 py-2 text-xs last:border-b-0 hover:bg-app-surface-hover"
              key={option}
            >
              <input
                checked={checked}
                className="size-4 accent-[var(--app-brand)]"
                onChange={() =>
                  onChange(
                    checked
                      ? values.filter((value) => value !== option)
                      : [...values, option],
                  )
                }
                type="checkbox"
              />
              <span className="min-w-0 break-all">{option}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function NavigationAdminScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [data, setData] = useState<NavigationAdminResponse | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [sectionSearch, setSectionSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [sectionEditorId, setSectionEditorId] = useState<number | null | 'new'>(null);
  const [itemEditorId, setItemEditorId] = useState<number | null | 'new'>(null);
  const [sectionEditorForm, setSectionEditorForm] =
    useState<SectionForm>(EMPTY_SECTION);
  const [itemEditorForm, setItemEditorForm] = useState<ItemForm>(EMPTY_ITEM);

  const selectedSection = useMemo(
    () => data?.sections.find((section) => section.id === selectedSectionId) ?? null,
    [data, selectedSectionId],
  );

  const editingSection =
    typeof sectionEditorId === 'number'
      ? data?.sections.find((section) => section.id === sectionEditorId) ?? null
      : null;

  const editingItem =
    typeof itemEditorId === 'number'
      ? data?.sections
          .flatMap((section) => section.items)
          .find((item) => item.id === itemEditorId) ?? null
      : null;

  const filteredSections = useMemo(() => {
    const query = sectionSearch.trim().toLocaleLowerCase('pt-BR');
    const sections = data?.sections ?? [];
    if (!query) return sections;
    return sections.filter((section) =>
      [section.label, section.slug, section.shortLabel ?? '']
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(query),
    );
  }, [data, sectionSearch]);

  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLocaleLowerCase('pt-BR');
    const items = selectedSection?.items ?? [];
    if (!query) return items;
    return items.filter((item) =>
      [item.label, item.slug, item.href ?? '']
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(query),
    );
  }, [itemSearch, selectedSection]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchNavigationAdmin();
      setData(next);
      setSelectedSectionId((current) =>
        current && next.sections.some((section) => section.id === current)
          ? current
          : next.sections[0]?.id ?? null,
      );
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openNewSection() {
    const lastOrder = data?.sections.at(-1)?.sortOrder ?? -10;
    setSectionEditorForm({
      ...EMPTY_SECTION,
      sortOrder: String(lastOrder + 10),
    });
    setSectionEditorId('new');
    setError(null);
  }

  function openEditSection(section: NavigationAdminSection) {
    setSectionEditorForm(sectionForm(section));
    setSectionEditorId(section.id);
    setError(null);
  }

  function openNewItem() {
    if (!selectedSection) return;
    setItemEditorForm({
      ...EMPTY_ITEM,
      sectionId: String(selectedSection.id),
      sortOrder: String((selectedSection.items.at(-1)?.sortOrder ?? -10) + 10),
    });
    setItemEditorId('new');
    setError(null);
  }

  function openEditItem(item: NavigationAdminItem) {
    setItemEditorForm(itemForm(item));
    setItemEditorId(item.id);
    setError(null);
  }

  async function saveSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved =
        sectionEditorId === 'new'
          ? await createNavigationSection(toSectionInput(sectionEditorForm))
          : await updateNavigationSection(
              Number(sectionEditorId),
              toSectionInput(sectionEditorForm),
            );
      setSectionEditorId(null);
      setSelectedSectionId(saved.id);
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
    try {
      const saved =
        itemEditorId === 'new'
          ? await createNavigationItem(toItemInput(itemEditorForm))
          : await updateNavigationItem(
              Number(itemEditorId),
              toItemInput(itemEditorForm),
            );
      setSelectedSectionId(Number(itemEditorForm.sectionId));
      setItemEditorId(null);
      await load();
      setSuccess(`Item #${saved.id} salvo com sucesso.`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-app-bg">
      <AppPageHeader
        actions={
          <button className={PRIMARY} onClick={openNewSection} type="button">
            Nova seção
          </button>
        }
        subtitle="Organize seções, páginas, ordem e visibilidade do menu lateral."
        title="Navegação"
        user={currentUser}
      />

      <div className="mx-auto w-full max-w-[1500px] p-5 max-sm:px-3">
        {error ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3 text-sm text-app-danger">
            <span>{error}</span>
            <button className={SECONDARY} onClick={() => void load()} type="button">
              Tentar novamente
            </button>
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 rounded-xl border border-app-success bg-app-success-soft px-4 py-3 text-sm text-app-success">
            {success}
          </div>
        ) : null}

        <div className="grid grid-cols-[320px_minmax(0,1fr)] gap-4 max-[980px]:grid-cols-1">
          <section className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-app-muted">Estrutura</span>
                <h2 className="m-0 mt-0.5 text-lg font-extrabold">Seções</h2>
              </div>
              <span className="text-xs text-app-muted">
                {data?.sections.length ?? 0}
              </span>
            </div>

            <input
              className={CONTROL}
              onChange={(event) => setSectionSearch(event.target.value)}
              placeholder="Buscar seção…"
              type="search"
              value={sectionSearch}
            />

            {loading ? (
              <div className="grid gap-2 py-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    className="h-16 animate-pulse rounded-xl bg-app-surface-muted"
                    key={index}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-3 grid max-h-[calc(100dvh-250px)] gap-2 overflow-y-auto pr-1 max-[980px]:max-h-none">
                {filteredSections.map((section) => (
                  <button
                    className={[
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition',
                      selectedSectionId === section.id
                        ? 'border-app-brand bg-app-brand-soft'
                        : 'border-app-border bg-app-surface hover:bg-app-surface-hover',
                    ].join(' ')}
                    key={section.id}
                    onClick={() => setSelectedSectionId(section.id)}
                    type="button"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-app-surface-muted text-app-muted">
                      <NavigationIcon className="size-5" name={section.icon} />
                    </span>
                    <span className="grid min-w-0 flex-1">
                      <strong className="truncate text-sm">{section.label}</strong>
                      <small className="truncate text-[11px] text-app-muted">
                        {section.slug} · ordem {section.sortOrder}
                      </small>
                    </span>
                    <span
                      className={
                        section.active
                          ? 'text-[10px] font-bold text-app-success'
                          : 'text-[10px] font-bold text-app-muted'
                      }
                    >
                      {section.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </button>
                ))}

                {!filteredSections.length ? (
                  <p className="py-6 text-center text-sm text-app-muted">
                    Nenhuma seção encontrada.
                  </p>
                ) : null}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
            {selectedSection ? (
              <>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-app-border-soft pb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-app-surface-muted text-app-muted">
                      <NavigationIcon className="size-6" name={selectedSection.icon} />
                    </span>
                    <div>
                      <span className="text-xs text-app-muted">Seção selecionada</span>
                      <h2 className="m-0 mt-0.5 text-xl font-extrabold">
                        {selectedSection.label}
                      </h2>
                      <p className="m-0 mt-1 text-xs text-app-muted">
                        {selectedSection.items.length} item(ns) · ordem {selectedSection.sortOrder}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className={SECONDARY}
                      onClick={() => openEditSection(selectedSection)}
                      type="button"
                    >
                      Editar seção
                    </button>
                    <button className={PRIMARY} onClick={openNewItem} type="button">
                      Novo item
                    </button>
                  </div>
                </div>

                <input
                  className={CONTROL}
                  onChange={(event) => setItemSearch(event.target.value)}
                  placeholder="Buscar página por nome, rota ou identificador…"
                  type="search"
                  value={itemSearch}
                />

                <div className="mt-3 grid grid-cols-2 gap-2 max-[760px]:grid-cols-1">
                  {filteredItems.map((item) => (
                    <button
                      className="grid gap-2 rounded-xl border border-app-border bg-app-surface p-3 text-left transition hover:border-app-border-strong hover:bg-app-surface-hover"
                      key={item.id}
                      onClick={() => openEditItem(item)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <strong className="text-sm">{item.label}</strong>
                        <span
                          className={
                            item.active
                              ? 'text-[10px] font-bold text-app-success'
                              : 'text-[10px] font-bold text-app-muted'
                          }
                        >
                          {item.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <span className="break-all text-[11px] text-app-muted">
                        {item.href ?? 'Sem rota'}
                      </span>
                      <span className="text-[10px] text-app-subtle">
                        {item.slug} · ordem {item.sortOrder}
                      </span>
                    </button>
                  ))}

                  {!filteredItems.length ? (
                    <div className="col-span-full rounded-xl border border-dashed border-app-border px-4 py-10 text-center text-sm text-app-muted">
                      Nenhum item nesta seção.
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="grid min-h-64 place-items-center text-center">
                <div>
                  <h2 className="m-0 text-lg font-extrabold">
                    Selecione uma seção
                  </h2>
                  <p className="m-0 mt-2 text-sm text-app-muted">
                    Os itens e ações de edição aparecerão aqui.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {sectionEditorId !== null ? (
        <Modal
          onClose={() => setSectionEditorId(null)}
          subtitle="Defina nome, ordem, status e ícone da seção do menu."
          title={sectionEditorId === 'new' ? 'Nova seção' : `Editar · ${editingSection?.label ?? 'Seção'}`}
        >
          <form className="grid gap-4" onSubmit={saveSection}>
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <label className={FIELD}>
                Identificador
                <input
                  className={CONTROL}
                  disabled={sectionEditorId !== 'new'}
                  maxLength={100}
                  onChange={(event) =>
                    setSectionEditorForm({
                      ...sectionEditorForm,
                      slug: event.target.value,
                    })
                  }
                  pattern="[a-z0-9][a-z0-9-]*"
                  required
                  value={sectionEditorForm.slug}
                />
              </label>
              <label className={FIELD}>
                Nome
                <input
                  className={CONTROL}
                  maxLength={150}
                  onChange={(event) =>
                    setSectionEditorForm({
                      ...sectionEditorForm,
                      label: event.target.value,
                    })
                  }
                  required
                  value={sectionEditorForm.label}
                />
              </label>
              <label className={FIELD}>
                Sigla
                <input
                  className={CONTROL}
                  maxLength={20}
                  onChange={(event) =>
                    setSectionEditorForm({
                      ...sectionEditorForm,
                      shortLabel: event.target.value,
                    })
                  }
                  value={sectionEditorForm.shortLabel}
                />
              </label>
              <label className={FIELD}>
                Ordem
                <input
                  className={CONTROL}
                  min={0}
                  onChange={(event) =>
                    setSectionEditorForm({
                      ...sectionEditorForm,
                      sortOrder: event.target.value,
                    })
                  }
                  required
                  type="number"
                  value={sectionEditorForm.sortOrder}
                />
              </label>
            </div>

            <div className={FIELD}>
              <span>Ícone</span>
              <IconPicker
                onChange={(icon) =>
                  setSectionEditorForm({ ...sectionEditorForm, icon })
                }
                value={sectionEditorForm.icon}
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                checked={sectionEditorForm.active}
                className="size-4 accent-[var(--app-brand)]"
                onChange={(event) =>
                  setSectionEditorForm({
                    ...sectionEditorForm,
                    active: event.target.checked,
                  })
                }
                type="checkbox"
              />
              Seção ativa no menu
            </label>

            <div className="flex justify-end gap-2 border-t border-app-border-soft pt-4">
              <button
                className={SECONDARY}
                disabled={saving}
                onClick={() => setSectionEditorId(null)}
                type="button"
              >
                Cancelar
              </button>
              <button className={PRIMARY} disabled={saving} type="submit">
                {saving ? 'Salvando…' : 'Salvar seção'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {itemEditorId !== null ? (
        <Modal
          onClose={() => setItemEditorId(null)}
          subtitle="Configure rota, ordem, seção e regras de visibilidade."
          title={itemEditorId === 'new' ? 'Novo item' : `Editar · ${editingItem?.label ?? 'Item'}`}
        >
          <form className="grid gap-4" onSubmit={saveItem}>
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <label className={FIELD}>
                Seção
                <select
                  className={CONTROL}
                  onChange={(event) =>
                    setItemEditorForm({
                      ...itemEditorForm,
                      sectionId: event.target.value,
                    })
                  }
                  required
                  value={itemEditorForm.sectionId}
                >
                  <option value="">Selecione</option>
                  {data?.sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={FIELD}>
                Identificador
                <input
                  className={CONTROL}
                  disabled={itemEditorId !== 'new'}
                  maxLength={120}
                  onChange={(event) =>
                    setItemEditorForm({
                      ...itemEditorForm,
                      slug: event.target.value,
                    })
                  }
                  pattern="[a-z0-9][a-z0-9-]*"
                  required
                  value={itemEditorForm.slug}
                />
              </label>

              <label className={FIELD}>
                Nome
                <input
                  className={CONTROL}
                  maxLength={160}
                  onChange={(event) =>
                    setItemEditorForm({
                      ...itemEditorForm,
                      label: event.target.value,
                    })
                  }
                  required
                  value={itemEditorForm.label}
                />
              </label>

              <label className={FIELD}>
                Rota
                <input
                  className={CONTROL}
                  maxLength={500}
                  onChange={(event) =>
                    setItemEditorForm({
                      ...itemEditorForm,
                      href: event.target.value,
                    })
                  }
                  placeholder="/rota"
                  required={itemEditorForm.status === 'available'}
                  value={itemEditorForm.href}
                />
              </label>

              <label className={FIELD}>
                Status
                <select
                  className={CONTROL}
                  onChange={(event) =>
                    setItemEditorForm({
                      ...itemEditorForm,
                      status: event.target.value as 'available' | 'planned',
                    })
                  }
                  value={itemEditorForm.status}
                >
                  <option value="available">Disponível</option>
                  <option value="planned">Planejado</option>
                </select>
              </label>

              <label className={FIELD}>
                Ordem
                <input
                  className={CONTROL}
                  min={0}
                  onChange={(event) =>
                    setItemEditorForm({
                      ...itemEditorForm,
                      sortOrder: event.target.value,
                    })
                  }
                  required
                  type="number"
                  value={itemEditorForm.sortOrder}
                />
              </label>
            </div>

            <div className={FIELD}>
              <span>Ícone</span>
              <IconPicker
                onChange={(icon) =>
                  setItemEditorForm({ ...itemEditorForm, icon })
                }
                value={itemEditorForm.icon}
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                checked={itemEditorForm.active}
                className="size-4 accent-[var(--app-brand)]"
                onChange={(event) =>
                  setItemEditorForm({
                    ...itemEditorForm,
                    active: event.target.checked,
                  })
                }
                type="checkbox"
              />
              Item ativo no menu
            </label>

            <fieldset className="rounded-xl border border-app-border p-4">
              <legend className="px-2 font-extrabold">Visibilidade</legend>
              <p className="mt-0 text-sm text-app-muted">
                Sem regra, o item fica visível para todos. Em “Qualquer permissão”,
                uma correspondência já libera o item.
              </p>
              <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
                <MultiChoice
                  onChange={(values) =>
                    setItemEditorForm({
                      ...itemEditorForm,
                      anyPermissions: values,
                    })
                  }
                  options={PERMISSION_OPTIONS}
                  title="Qualquer permissão"
                  values={itemEditorForm.anyPermissions}
                />
                <MultiChoice
                  onChange={(values) =>
                    setItemEditorForm({
                      ...itemEditorForm,
                      allPermissions: values,
                    })
                  }
                  options={PERMISSION_OPTIONS}
                  title="Todas as permissões"
                  values={itemEditorForm.allPermissions}
                />
                <MultiChoice
                  onChange={(values) =>
                    setItemEditorForm({
                      ...itemEditorForm,
                      anyRoles: values,
                    })
                  }
                  options={ROLE_OPTIONS}
                  title="Qualquer role"
                  values={itemEditorForm.anyRoles}
                />
              </div>
            </fieldset>

            <div className="flex justify-end gap-2 border-t border-app-border-soft pt-4">
              <button
                className={SECONDARY}
                disabled={saving}
                onClick={() => setItemEditorId(null)}
                type="button"
              >
                Cancelar
              </button>
              <button className={PRIMARY} disabled={saving} type="submit">
                {saving ? 'Salvando…' : 'Salvar item'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </main>
  );
}

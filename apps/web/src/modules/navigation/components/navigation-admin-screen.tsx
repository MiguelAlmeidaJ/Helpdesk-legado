"use client";

import {
  AppPermission,
  UserRole,
  type CurrentUserResponse,
  type NavigationAdminItem,
  type NavigationAdminItemInput,
  type NavigationAdminResponse,
  type NavigationAdminSection,
  type NavigationAdminSectionInput,
  type NavigationVisibilityCondition,
} from '@helpdesk/contracts';
import Link from 'next/link';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import {
  createNavigationItem,
  createNavigationSection,
  fetchNavigationAdmin,
  updateNavigationItem,
  updateNavigationSection,
} from '../api/navigation-admin-api';
import styles from './navigation-admin-screen.module.css';

interface SectionForm {
  slug: string;
  label: string;
  shortLabel: string;
  sortOrder: string;
  active: boolean;
}

interface ItemForm {
  sectionId: string;
  slug: string;
  label: string;
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
  sortOrder: '0',
  active: true,
};

const EMPTY_ITEM: ItemForm = {
  sectionId: '',
  slug: '',
  label: '',
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

function fromSection(section: NavigationAdminSection): SectionForm {
  return {
    slug: section.slug,
    label: section.label,
    shortLabel: section.shortLabel ?? '',
    sortOrder: String(section.sortOrder),
    active: section.active,
  };
}

function fromItem(item: NavigationAdminItem): ItemForm {
  return {
    sectionId: String(item.sectionId),
    slug: item.slug,
    label: item.label,
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
    sortOrder: Number(form.sortOrder),
    active: form.active,
  };
}

function itemInput(form: ItemForm): NavigationAdminItemInput {
  return {
    sectionId: Number(form.sectionId),
    slug: form.slug.trim(),
    label: form.label.trim(),
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
    <main className="tickets-page">
      <header className="tickets-header">
        <div className="tickets-header-left">
          <AppSidebar />
          <Link className="tickets-brand" href="/dashboard">
            <strong>Helpdesk</strong>
            <span>Nova plataforma</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className="tickets-content">
        <div className="tickets-title-row">
          <div>
            <span className="eyebrow">Administração</span>
            <h1>Navegação</h1>
            <p>Organize seções, páginas, ordem e visibilidade do menu lateral.</p>
          </div>
          <button className="button button-primary" onClick={newSection} type="button">
            Nova seção
          </button>
        </div>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        {success ? <div className={styles.success} role="status">{success}</div> : null}

        <div className={styles.layout}>
          <section className={styles.sectionsCard}>
            <div className={styles.cardTitle}>
              <div>
                <span>Estrutura</span>
                <strong>Seções</strong>
              </div>
              <small>{data?.sections.length ?? 0} cadastradas</small>
            </div>
            {loading && !data ? <p>Carregando…</p> : null}
            <div className={styles.sectionList}>
              {data?.sections.map((section) => (
                <button
                  data-active={selectedSectionId === section.id}
                  key={section.id}
                  onClick={() => selectSection(section)}
                  type="button"
                >
                  <span className={styles.sectionBadge}>{section.shortLabel || '—'}</span>
                  <span>
                    <strong>{section.label}</strong>
                    <small>{section.slug} · ordem {section.sortOrder}</small>
                  </span>
                  <em data-active={section.active}>{section.active ? 'Ativa' : 'Inativa'}</em>
                </button>
              ))}
            </div>
          </section>

          <div className={styles.workspace}>
            <section className={styles.editorCard}>
              <div className={styles.cardTitle}>
                <div>
                  <span>Seção</span>
                  <strong>{selectedSectionId ? `Editar #${selectedSectionId}` : 'Nova seção'}</strong>
                </div>
              </div>
              <form className={styles.form} onSubmit={saveSection}>
                <div className={styles.formGrid}>
                  <label><span>Slug</span><input disabled={selectedSectionId !== null} maxLength={100} onChange={(event) => setSectionForm({ ...sectionForm, slug: event.target.value })} pattern="[a-z0-9][a-z0-9-]*" required value={sectionForm.slug} /></label>
                  <label><span>Nome</span><input maxLength={150} onChange={(event) => setSectionForm({ ...sectionForm, label: event.target.value })} required value={sectionForm.label} /></label>
                  <label><span>Sigla</span><input maxLength={20} onChange={(event) => setSectionForm({ ...sectionForm, shortLabel: event.target.value })} value={sectionForm.shortLabel} /></label>
                  <label><span>Ordem</span><input min={0} onChange={(event) => setSectionForm({ ...sectionForm, sortOrder: event.target.value })} required type="number" value={sectionForm.sortOrder} /></label>
                </div>
                <label className={styles.toggle}><input checked={sectionForm.active} onChange={(event) => setSectionForm({ ...sectionForm, active: event.target.checked })} type="checkbox" /><span>Seção ativa no menu</span></label>
                <div className={styles.actions}><button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando…' : 'Salvar seção'}</button></div>
              </form>
            </section>

            <section className={styles.itemsCard}>
              <div className={styles.cardTitle}>
                <div>
                  <span>Páginas</span>
                  <strong>Itens da seção</strong>
                </div>
                <button className="button" disabled={!selectedSectionId} onClick={newItem} type="button">Novo item</button>
              </div>
              {!selectedSectionId ? <p>Salve ou selecione uma seção para gerenciar seus itens.</p> : (
                <>
                  <div className={styles.itemList}>
                    {selectedSection?.items.map((item) => (
                      <button data-active={selectedItemId === item.id} key={item.id} onClick={() => selectItem(item)} type="button">
                        <span><strong>{item.label}</strong><small>{item.href || 'Sem rota'} · ordem {item.sortOrder}</small></span>
                        <em data-active={item.active}>{item.active ? item.status : 'inativo'}</em>
                      </button>
                    ))}
                    {selectedSection?.items.length === 0 ? <p>Nenhum item nesta seção.</p> : null}
                  </div>

                  {(selectedItemId !== null || itemForm.sectionId) ? (
                    <form className={styles.form} onSubmit={saveItem}>
                      <div className={styles.formGrid}>
                        <label><span>Seção</span><select onChange={(event) => setItemForm({ ...itemForm, sectionId: event.target.value })} required value={itemForm.sectionId}>{data?.sections.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}</select></label>
                        <label><span>Slug</span><input disabled={selectedItemId !== null} maxLength={120} onChange={(event) => setItemForm({ ...itemForm, slug: event.target.value })} pattern="[a-z0-9][a-z0-9-]*" required value={itemForm.slug} /></label>
                        <label><span>Nome</span><input maxLength={160} onChange={(event) => setItemForm({ ...itemForm, label: event.target.value })} required value={itemForm.label} /></label>
                        <label><span>Rota</span><input maxLength={500} onChange={(event) => setItemForm({ ...itemForm, href: event.target.value })} placeholder="/exemplo" required={itemForm.status === 'available'} value={itemForm.href} /></label>
                        <label><span>Status</span><select onChange={(event) => setItemForm({ ...itemForm, status: event.target.value as 'available' | 'planned' })} value={itemForm.status}><option value="available">Disponível</option><option value="planned">Em migração</option></select></label>
                        <label><span>Ordem</span><input min={0} onChange={(event) => setItemForm({ ...itemForm, sortOrder: event.target.value })} required type="number" value={itemForm.sortOrder} /></label>
                      </div>

                      <label className={styles.toggle}><input checked={itemForm.active} onChange={(event) => setItemForm({ ...itemForm, active: event.target.checked })} type="checkbox" /><span>Item ativo no menu</span></label>

                      <fieldset className={styles.visibility}>
                        <legend>Visibilidade</legend>
                        <p>Grupos diferentes são combinados com AND. Dentro de “qualquer”, basta uma correspondência.</p>
                        <div className={styles.visibilityGrid}>
                          <label><span>Qualquer permissão</span><select multiple onChange={(event) => setItemForm({ ...itemForm, anyPermissions: selectedValues(event) })} value={itemForm.anyPermissions}>{PERMISSION_OPTIONS.map((permission) => <option key={permission} value={permission}>{permission}</option>)}</select></label>
                          <label><span>Todas as permissões</span><select multiple onChange={(event) => setItemForm({ ...itemForm, allPermissions: selectedValues(event) })} value={itemForm.allPermissions}>{PERMISSION_OPTIONS.map((permission) => <option key={permission} value={permission}>{permission}</option>)}</select></label>
                          <label><span>Qualquer role</span><select multiple onChange={(event) => setItemForm({ ...itemForm, anyRoles: selectedValues(event) })} value={itemForm.anyRoles}>{ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
                        </div>
                      </fieldset>

                      <div className={styles.actions}><button className="button button-primary" disabled={saving} type="submit">{saving ? 'Salvando…' : 'Salvar item'}</button></div>
                    </form>
                  ) : <p>Selecione um item ou clique em “Novo item”.</p>}
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

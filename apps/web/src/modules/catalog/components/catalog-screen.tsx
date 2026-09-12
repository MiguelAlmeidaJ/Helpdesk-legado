'use client';

import {
  AppPermission,
  type CatalogDetailResponse,
  type CatalogFiltersResponse,
  type CatalogListResponse,
  type CatalogSector,
  type CatalogWriteInput,
  type CurrentUserResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import {
  createCatalog,
  fetchCatalog,
  fetchCatalogFilters,
  fetchCatalogs,
  updateCatalog,
} from '../api/catalog-api';
import styles from './catalog-screen.module.css';

const PAGE_SIZE = 30;

interface CatalogFormState {
  id: number | null;
  sector: CatalogSector;
  categoryId: string;
  clientId: string;
  title: string;
  content: string;
}

interface AppliedFilters {
  search: string;
  sector: '' | CatalogSector;
  categoryId: string;
  clientId: string;
}

const EMPTY_FILTERS: AppliedFilters = {
  search: '',
  sector: '',
  categoryId: '',
  clientId: '',
};

function apiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.body && typeof error.body === 'object') {
      const value = (error.body as Record<string, unknown>).message;
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').join(' ');
    }
    if (error.status === 403) return 'Seu usuário não possui permissão para esta operação.';
    if (error.status === 404) return 'Catálogo não encontrado.';
    return `A API respondeu com erro ${error.status}.`;
  }
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
}

function hasPermission(user: CurrentUserResponse, permission: AppPermission): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin || grant.permission === permission,
  );
}

function canManageSector(user: CurrentUserResponse, sector: CatalogSector): boolean {
  return hasPermission(
    user,
    sector === 1 ? AppPermission.CatalogTiManage : AppPermission.CatalogDevOpsManage,
  );
}

function sectorLabel(sector: CatalogSector): string {
  return sector === 1 ? 'TI' : 'DevOps';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formFromDetail(detail: CatalogDetailResponse): CatalogFormState {
  return {
    id: detail.id,
    sector: detail.sector,
    categoryId: String(detail.categoryId),
    clientId: String(detail.clientId),
    title: detail.title,
    content: detail.content,
  };
}

export function CatalogScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const [filters, setFilters] = useState<CatalogFiltersResponse | null>(null);
  const [draftFilters, setDraftFilters] = useState<AppliedFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(EMPTY_FILTERS);
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<CatalogListResponse | null>(null);
  const [detail, setDetail] = useState<CatalogDetailResponse | null>(null);
  const [form, setForm] = useState<CatalogFormState | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const manageableSectors = useMemo(
    () => (filters?.allowedSectors ?? []).filter((sector) => canManageSector(currentUser, sector)),
    [currentUser, filters],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalogFilters(controller.signal)
      .then(setFilters)
      .catch((reason) => {
        if (reason instanceof Error && reason.name === 'AbortError') return;
        setError(apiMessage(reason));
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingList(true);
    setError(null);
    fetchCatalogs(
      {
        search: appliedFilters.search || undefined,
        sector: appliedFilters.sector || undefined,
        categoryId: appliedFilters.categoryId ? Number(appliedFilters.categoryId) : undefined,
        clientId: appliedFilters.clientId ? Number(appliedFilters.clientId) : undefined,
        offset,
        limit: PAGE_SIZE,
      },
      controller.signal,
    )
      .then(setResult)
      .catch((reason) => {
        if (reason instanceof Error && reason.name === 'AbortError') return;
        setError(apiMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingList(false);
      });
    return () => controller.abort();
  }, [appliedFilters, offset]);

  async function openDetail(id: number) {
    setLoadingDetail(true);
    setError(null);
    setSuccess(null);
    setForm(null);
    try {
      setDetail(await fetchCatalog(id));
    } catch (reason) {
      setError(apiMessage(reason));
    } finally {
      setLoadingDetail(false);
    }
  }

  function startCreate() {
    const sector = manageableSectors[0];
    if (!sector) return;
    setDetail(null);
    setSuccess(null);
    setError(null);
    setForm({ id: null, sector, categoryId: '', clientId: '', title: '', content: '' });
  }

  function startEdit() {
    if (!detail || !canManageSector(currentUser, detail.sector)) return;
    setError(null);
    setSuccess(null);
    setForm(formFromDetail(detail));
  }

  function closeEditor() {
    setForm(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;

    const input: CatalogWriteInput = {
      sector: form.sector,
      categoryId: Number(form.categoryId),
      clientId: Number(form.clientId),
      title: form.title.trim(),
      content: form.content,
    };

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = form.id
        ? await updateCatalog(form.id, input)
        : await createCatalog(input);
      setDetail(saved);
      setForm(null);
      setSuccess(form.id ? 'Catálogo atualizado com sucesso.' : 'Catálogo criado com sucesso.');
      setOffset(0);
      const refreshed = await fetchCatalogs({
        search: appliedFilters.search || undefined,
        sector: appliedFilters.sector || undefined,
        categoryId: appliedFilters.categoryId ? Number(appliedFilters.categoryId) : undefined,
        clientId: appliedFilters.clientId ? Number(appliedFilters.clientId) : undefined,
        offset: 0,
        limit: PAGE_SIZE,
      });
      setResult(refreshed);
    } catch (reason) {
      setError(apiMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOffset(0);
    setAppliedFilters({ ...draftFilters, search: draftFilters.search.trim() });
    setDetail(null);
    setForm(null);
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setOffset(0);
    setDetail(null);
    setForm(null);
  }

  const canEditDetail = detail ? canManageSector(currentUser, detail.sector) : false;

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
            <span className="eyebrow">Cadastros</span>
            <h1>Catálogos</h1>
            <p>Consulta e manutenção do catálogo de atendimento com escopo por setor.</p>
          </div>
          {manageableSectors.length > 0 ? (
            <button className="button button-primary" onClick={startCreate} type="button">
              Novo catálogo
            </button>
          ) : null}
        </div>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        {success ? <div className={styles.success} role="status">{success}</div> : null}

        <form className={styles.filters} onSubmit={applyFilters}>
          <label>
            <span>Busca</span>
            <input
              maxLength={200}
              onChange={(event) => setDraftFilters({ ...draftFilters, search: event.target.value })}
              placeholder="Título do catálogo"
              type="search"
              value={draftFilters.search}
            />
          </label>
          <label>
            <span>Setor</span>
            <select
              onChange={(event) => setDraftFilters({
                ...draftFilters,
                sector: event.target.value ? Number(event.target.value) as CatalogSector : '',
              })}
              value={draftFilters.sector}
            >
              <option value="">Todos permitidos</option>
              {filters?.allowedSectors.map((sector) => (
                <option key={sector} value={sector}>{sectorLabel(sector)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Cliente</span>
            <select
              onChange={(event) => setDraftFilters({ ...draftFilters, clientId: event.target.value })}
              value={draftFilters.clientId}
            >
              <option value="">Todos</option>
              {filters?.clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name ?? `Cliente #${client.id}`}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Categoria</span>
            <select
              onChange={(event) => setDraftFilters({ ...draftFilters, categoryId: event.target.value })}
              value={draftFilters.categoryId}
            >
              <option value="">Todas</option>
              {filters?.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <div className={styles.filterActions}>
            <button className="button" onClick={clearFilters} type="button">Limpar</button>
            <button className="button button-primary" type="submit">Filtrar</button>
          </div>
        </form>

        <div className={styles.layout}>
          <section className={styles.listCard}>
            <div className={styles.cardHeader}>
              <div>
                <span className="eyebrow">Resultados</span>
                <h2>Catálogos disponíveis</h2>
              </div>
              {loadingList ? <span className={styles.loading}>Carregando…</span> : null}
            </div>

            <div className={styles.list}>
              {!loadingList && result?.items.length === 0 ? (
                <p className={styles.empty}>Nenhum catálogo encontrado com os filtros atuais.</p>
              ) : null}
              {result?.items.map((item) => (
                <button
                  className={styles.listItem}
                  data-active={detail?.id === item.id}
                  key={item.id}
                  onClick={() => void openDetail(item.id)}
                  type="button"
                >
                  <span className={styles.listTitle}>{item.title}</span>
                  <span className={styles.listMeta}>
                    {sectorLabel(item.sector)} · {item.clientName ?? `Cliente #${item.clientId}`}
                  </span>
                  <span className={styles.listMeta}>{item.categoryName ?? `Categoria #${item.categoryId}`}</span>
                </button>
              ))}
            </div>

            <div className={styles.pagination}>
              <button
                className="button"
                disabled={loadingList || offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                type="button"
              >
                Anterior
              </button>
              <span>{offset + 1}{result?.items.length ? `–${offset + result.items.length}` : ''}</span>
              <button
                className="button"
                disabled={loadingList || !result?.hasMore || result.nextOffset === null}
                onClick={() => {
                  const nextOffset = result?.nextOffset;
                  if (nextOffset !== null && nextOffset !== undefined) setOffset(nextOffset);
                }}
                type="button"
              >
                Próxima
              </button>
            </div>
          </section>

          <section className={styles.detailCard}>
            {form ? (
              <form className={styles.editor} onSubmit={save}>
                <div className={styles.cardHeader}>
                  <div>
                    <span className="eyebrow">{form.id ? 'Edição' : 'Novo registro'}</span>
                    <h2>{form.id ? `Editar catálogo #${form.id}` : 'Novo catálogo'}</h2>
                  </div>
                  <button className="button" disabled={saving} onClick={closeEditor} type="button">Cancelar</button>
                </div>

                <div className={styles.formGrid}>
                  <label>
                    <span>Setor</span>
                    <select
                      disabled={saving}
                      onChange={(event) => setForm({ ...form, sector: Number(event.target.value) as CatalogSector })}
                      required
                      value={form.sector}
                    >
                      {manageableSectors.map((sector) => (
                        <option key={sector} value={sector}>{sectorLabel(sector)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Cliente</span>
                    <select
                      disabled={saving}
                      onChange={(event) => setForm({ ...form, clientId: event.target.value })}
                      required
                      value={form.clientId}
                    >
                      <option value="">Selecione</option>
                      {filters?.clients.map((client) => (
                        <option key={client.id} value={client.id}>{client.name ?? `Cliente #${client.id}`}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Categoria</span>
                    <select
                      disabled={saving}
                      onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                      required
                      value={form.categoryId}
                    >
                      <option value="">Selecione</option>
                      {filters?.categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.wide}>
                    <span>Título</span>
                    <input
                      disabled={saving}
                      maxLength={255}
                      onChange={(event) => setForm({ ...form, title: event.target.value })}
                      required
                      value={form.title}
                    />
                  </label>
                  <label className={styles.wide}>
                    <span>Conteúdo HTML</span>
                    <textarea
                      disabled={saving}
                      onChange={(event) => setForm({ ...form, content: event.target.value })}
                      rows={18}
                      value={form.content}
                    />
                    <small>O conteúdo legado é mantido como HTML. A visualização é isolada em sandbox.</small>
                  </label>
                </div>

                <div className={styles.editorActions}>
                  <button className="button button-primary" disabled={saving} type="submit">
                    {saving ? 'Salvando…' : 'Salvar catálogo'}
                  </button>
                </div>
              </form>
            ) : loadingDetail ? (
              <p className={styles.empty}>Carregando catálogo…</p>
            ) : detail ? (
              <div className={styles.detail}>
                <div className={styles.cardHeader}>
                  <div>
                    <span className="eyebrow">Catálogo #{detail.id}</span>
                    <h2>{detail.title}</h2>
                  </div>
                  {canEditDetail ? (
                    <button className="button button-primary" onClick={startEdit} type="button">Editar</button>
                  ) : null}
                </div>
                <dl className={styles.metadata}>
                  <div><dt>Setor</dt><dd>{sectorLabel(detail.sector)}</dd></div>
                  <div><dt>Cliente</dt><dd>{detail.clientName ?? `#${detail.clientId}`}</dd></div>
                  <div><dt>Categoria</dt><dd>{detail.categoryName ?? `#${detail.categoryId}`}</dd></div>
                  <div><dt>Atualizado</dt><dd>{formatDate(detail.updatedAt ?? detail.createdAt)}</dd></div>
                </dl>
                {detail.content ? (
                  <iframe
                    className={styles.preview}
                    sandbox=""
                    srcDoc={detail.content}
                    title={`Conteúdo do catálogo ${detail.title}`}
                  />
                ) : (
                  <p className={styles.empty}>Este catálogo não possui conteúdo.</p>
                )}
              </div>
            ) : (
              <div className={styles.placeholder}>
                <span className="eyebrow">Visualização</span>
                <h2>Selecione um catálogo</h2>
                <p>Escolha um item da lista para consultar o conteúdo e os metadados.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

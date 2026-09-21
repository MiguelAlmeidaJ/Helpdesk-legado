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
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import {
  createCatalog,
  fetchCatalog,
  fetchCatalogFilters,
  fetchCatalogs,
  updateCatalog,
} from '../api/catalog-api';
const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] border border-app-border-strong bg-app-surface px-4 font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-50';

const PRIMARY_BUTTON_CLASS =
  `${BUTTON_CLASS} border-app-brand bg-app-brand text-white hover:bg-app-brand-hover`;

const CONTROL_CLASS =
  '[&_input]:min-h-10 [&_input]:w-full [&_input]:rounded-[9px] [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-[11px] [&_input]:py-[9px] [&_input]:text-app-text [&_input]:outline-none [&_input]:transition [&_select]:min-h-10 [&_select]:w-full [&_select]:rounded-[9px] [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-[11px] [&_select]:py-[9px] [&_select]:text-app-text [&_select]:outline-none [&_select]:transition [&_input:focus]:border-app-brand [&_input:focus]:ring-3 [&_input:focus]:ring-[var(--app-brand-ring)] [&_select:focus]:border-app-brand [&_select:focus]:ring-3 [&_select:focus]:ring-[var(--app-brand-ring)]';

const styles = {
  page: 'min-h-screen bg-app-bg text-app-text',
  header:
    'sticky top-0 z-20 flex items-center justify-between gap-5 border-b border-app-border bg-[var(--app-header-bg)] px-6 py-3.5 backdrop-blur-xl max-sm:px-3.5',
  headerLeft: 'flex min-w-0 items-center gap-2.5',
  brand:
    'flex items-baseline gap-2.5 no-underline [&_strong]:text-lg [&_span]:text-[13px] [&_span]:text-app-subtle max-sm:[&_span]:hidden',
  content: 'mx-auto w-full max-w-[1500px] p-6 max-sm:px-3.5',
  titleRow:
    'mb-[18px] flex items-end justify-between gap-6 max-md:flex-col max-md:items-stretch [&_h1]:m-0 [&_h1]:text-[28px] [&_p]:mt-1.5 [&_p]:mb-0 [&_p]:text-app-muted-strong',
  eyebrow:
    'mb-2 inline-block text-xs font-extrabold uppercase tracking-[0.1em] text-app-muted',
  button: BUTTON_CLASS,
  buttonPrimary: PRIMARY_BUTTON_CLASS,
  filters:
    `mb-[18px] grid grid-cols-1 items-end gap-3 rounded-[14px] border border-app-border bg-app-surface p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,1fr))_auto] [&_label]:grid [&_label]:gap-1.5 [&_label]:text-[13px] [&_label]:font-semibold ${CONTROL_CLASS}`,
  filterActions: 'flex justify-end gap-2 md:col-span-2 xl:col-span-1 max-sm:flex-col',
  layout:
    'grid items-start gap-[18px] xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.65fr)]',
  listCard:
    'min-h-[520px] overflow-hidden rounded-[14px] border border-app-border bg-app-surface shadow-sm shadow-slate-950/5 dark:shadow-black/10',
  detailCard:
    'min-h-[520px] overflow-hidden rounded-[14px] border border-app-border bg-app-surface shadow-sm shadow-slate-950/5 dark:shadow-black/10',
  cardHeader:
    'flex items-start justify-between gap-4 border-b border-app-border-soft px-5 py-[18px] max-sm:flex-col [&_h2]:mt-[3px] [&_h2]:mb-0 [&_h2]:text-xl',
  loading: 'text-[13px] text-app-muted',
  list: 'max-h-[620px] overflow-auto',
  listItem:
    'grid w-full cursor-pointer gap-1 border-0 border-b border-app-border-soft bg-transparent px-[18px] py-3.5 text-left text-inherit transition hover:bg-app-surface-hover data-[active=true]:bg-app-surface-hover data-[active=true]:shadow-[inset_3px_0_0_var(--app-brand)]',
  listTitle: 'font-bold leading-[1.35] text-app-text',
  listMeta: 'text-xs text-app-muted',
  pagination:
    'flex items-center justify-between gap-2.5 border-t border-app-border-soft px-[18px] py-3.5 text-[13px] text-app-muted max-sm:flex-wrap',
  detail: 'min-h-[520px]',
  editor: 'min-h-[520px]',
  metadata:
    'm-0 grid grid-cols-1 gap-2.5 border-b border-app-border-soft px-5 py-4 sm:grid-cols-2 xl:grid-cols-4 [&_div]:min-w-0 [&_dt]:text-[11px] [&_dt]:font-bold [&_dt]:uppercase [&_dt]:text-app-muted [&_dd]:mt-[3px] [&_dd]:mb-0 [&_dd]:overflow-hidden [&_dd]:text-ellipsis [&_dd]:whitespace-nowrap [&_dd]:text-[13px] [&_dd]:text-app-text-soft',
  preview: 'block min-h-[520px] w-full border-0 bg-white',
  formGrid:
    `grid grid-cols-1 gap-3.5 p-5 md:grid-cols-3 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-[13px] [&_label]:font-semibold [&_small]:font-normal [&_small]:text-app-muted ${CONTROL_CLASS} [&_textarea]:min-h-[320px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-[9px] [&_textarea]:border [&_textarea]:border-app-border-strong [&_textarea]:bg-app-surface [&_textarea]:px-[11px] [&_textarea]:py-[9px] [&_textarea]:font-mono [&_textarea]:text-[13px] [&_textarea]:leading-[1.5] [&_textarea]:text-app-text [&_textarea]:outline-none [&_textarea]:transition [&_textarea:focus]:border-app-brand [&_textarea:focus]:ring-3 [&_textarea:focus]:ring-[var(--app-brand-ring)] [&_input:disabled]:cursor-not-allowed [&_input:disabled]:opacity-50 [&_select:disabled]:cursor-not-allowed [&_select:disabled]:opacity-50 [&_textarea:disabled]:cursor-not-allowed [&_textarea:disabled]:opacity-50`,
  wide: 'md:col-span-3',
  editorActions: 'flex justify-end gap-2 px-5 pb-5 max-sm:[&>*]:w-full',
  placeholder:
    'grid min-h-[480px] place-content-center px-5 py-7 text-center text-app-muted [&_h2]:mt-[3px] [&_h2]:mb-0 [&_h2]:text-xl [&_p]:max-w-[420px]',
  empty: 'm-0 px-5 py-7 text-app-muted',
  error:
    'mb-3.5 rounded-[9px] border border-app-danger-border bg-app-danger-soft px-3.5 py-[11px] text-sm text-app-danger',
  success:
    'mb-3.5 rounded-[9px] border border-emerald-300/70 bg-emerald-50 px-3.5 py-[11px] text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200',
} as const;


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
    <main className={styles.page}>
      <AppPageHeader
        actions={
          manageableSectors.length > 0 ? (
            <button className={styles.buttonPrimary} onClick={startCreate} type="button">
              Novo catálogo
            </button>
          ) : null
        }
        subtitle="Consulta e manutenção do catálogo de atendimento com escopo por setor."
        title="Catálogos"
        user={currentUser}
      />

      <div className={styles.content}>

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
            <button className={styles.button} onClick={clearFilters} type="button">Limpar</button>
            <button className={styles.buttonPrimary} type="submit">Filtrar</button>
          </div>
        </form>

        <div className={styles.layout}>
          <section className={styles.listCard}>
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.eyebrow}>Resultados</span>
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
                className={styles.button}
                disabled={loadingList || offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                type="button"
              >
                Anterior
              </button>
              <span>{offset + 1}{result?.items.length ? `–${offset + result.items.length}` : ''}</span>
              <button
                className={styles.button}
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
                    <span className={styles.eyebrow}>{form.id ? 'Edição' : 'Novo registro'}</span>
                    <h2>{form.id ? `Editar catálogo #${form.id}` : 'Novo catálogo'}</h2>
                  </div>
                  <button className={styles.button} disabled={saving} onClick={closeEditor} type="button">Cancelar</button>
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
                  <button className={styles.buttonPrimary} disabled={saving} type="submit">
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
                    <span className={styles.eyebrow}>Catálogo #{detail.id}</span>
                    <h2>{detail.title}</h2>
                  </div>
                  {canEditDetail ? (
                    <button className={styles.buttonPrimary} onClick={startEdit} type="button">Editar</button>
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
                <span className={styles.eyebrow}>Visualização</span>
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

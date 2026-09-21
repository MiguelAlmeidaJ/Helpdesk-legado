'use client';

import {
  AppPermission,
  type CatalogDetailResponse,
  type CatalogFiltersResponse,
  type CurrentUserResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import {
  fetchCatalog,
  fetchCatalogFilters,
  resolveCatalogs,
} from '../../catalog/api/catalog-api';
const styles = {
  card: 'overflow-hidden rounded-[14px] border border-app-border bg-app-surface',
  header:
    'flex items-start justify-between gap-[18px] border-b border-app-border-soft px-5 py-[18px] max-[700px]:flex-col [&_h2]:mt-[3px] [&_h2]:mb-0 [&_h2]:text-lg [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:text-[13px] [&_p]:text-app-muted',
  eyebrow:
    'text-[11px] font-bold uppercase tracking-[0.08em] text-app-muted',
  manageLink:
    'shrink-0 text-[13px] font-bold text-app-brand no-underline hover:underline',
  locator:
    'grid grid-cols-1 items-end gap-2.5 px-5 py-4 min-[701px]:grid-cols-[minmax(220px,1fr)_auto] [&_label]:grid [&_label]:gap-1.5 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-app-text-soft [&_select]:min-h-10 [&_select]:rounded-[9px] [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-2.5 [&_select]:py-2 [&_select]:text-app-text [&_select]:outline-none [&_select]:transition [&_select:focus]:border-app-brand [&_select:focus]:ring-3 [&_select:focus]:ring-[var(--app-brand-ring)] [&_select:disabled]:cursor-not-allowed [&_select:disabled]:opacity-50 [&_button]:min-h-10 [&_button]:rounded-[9px] [&_button]:border [&_button]:border-app-brand [&_button]:bg-app-brand [&_button]:px-3.5 [&_button]:py-2 [&_button]:font-bold [&_button]:text-white dark:[&_button]:text-slate-950 [&_button]:transition [&_button:hover]:bg-app-brand-hover [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50',
  error:
    'mx-5 mb-4 rounded-[9px] border border-app-danger-border bg-app-danger-soft px-3 py-2.5 text-[13px] text-app-danger',
  feedback:
    'mx-5 mb-4 rounded-[9px] border border-app-brand/30 bg-app-brand-soft px-3 py-2.5 text-[13px] text-app-brand',
  choices: 'grid gap-2 px-5 pb-4',
  choice:
    'grid gap-[3px] rounded-[9px] border border-app-border bg-app-surface px-3 py-[11px] text-left text-app-text transition hover:bg-app-surface-hover data-[active=true]:border-app-brand data-[active=true]:bg-app-brand-soft [&_span]:text-xs [&_span]:text-app-muted',
  preview: 'border-t border-app-border-soft',
  previewHeader:
    'flex items-start justify-between gap-4 px-5 py-3.5 max-[700px]:flex-col [&_h3]:mt-[3px] [&_h3]:mb-0 [&_h3]:text-base [&_span]:text-xs [&_span]:text-app-muted [&_small]:text-xs [&_small]:text-app-muted',
  frame:
    'block min-h-80 w-full border-0 border-t border-app-border-soft bg-white',
} as const;

function hasCatalogAccess(user: CurrentUserResponse): boolean {
  const permissions = new Set([
    AppPermission.CatalogTiRead,
    AppPermission.CatalogTiManage,
    AppPermission.CatalogDevOpsRead,
    AppPermission.CatalogDevOpsManage,
  ]);

  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      permissions.has(grant.permission),
  );
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.body && typeof reason.body === 'object') {
      const message = (reason.body as Record<string, unknown>).message;
      if (typeof message === 'string') return message;
    }
    if (reason.status === 403) return 'Seu usuário não possui acesso aos catálogos deste setor.';
    return `A API respondeu com erro ${reason.status}.`;
  }

  return reason instanceof Error
    ? reason.message
    : 'Não foi possível localizar os catálogos.';
}

function sectorLabel(sector: 1 | 2): string {
  return sector === 1 ? 'TI' : 'DevOps';
}

export function TicketCatalogPanel({
  clientId,
  currentUser,
}: {
  clientId: number;
  currentUser: CurrentUserResponse;
}) {
  const allowed = useMemo(() => hasCatalogAccess(currentUser), [currentUser]);
  const [filters, setFilters] = useState<CatalogFiltersResponse | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [catalogs, setCatalogs] = useState<CatalogDetailResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;

    const controller = new AbortController();
    setLoadingFilters(true);
    fetchCatalogFilters(controller.signal)
      .then(setFilters)
      .catch((reason) => {
        if (reason instanceof Error && reason.name === 'AbortError') return;
        setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingFilters(false);
      });

    return () => controller.abort();
  }, [allowed]);

  if (!allowed) return null;

  const selected = catalogs.find((catalog) => catalog.id === selectedId) ?? null;

  async function locate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryId) return;

    setLoadingCatalogs(true);
    setError(null);
    setFeedback(null);
    setCatalogs([]);
    setSelectedId(null);

    try {
      const resolution = await resolveCatalogs(clientId, Number(categoryId));

      if (resolution.status === 'none') {
        setFeedback('Nenhum catálogo encontrado para este cliente e categoria.');
        return;
      }

      const details = await Promise.all(
        resolution.catalogIds.map((id) => fetchCatalog(id)),
      );
      setCatalogs(details);
      setSelectedId(details[0]?.id ?? null);
      setFeedback(
        details.length === 1
          ? '1 catálogo encontrado.'
          : `${details.length} catálogos encontrados. Selecione um para visualizar.`,
      );
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoadingCatalogs(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Base de conhecimento</span>
          <h2>Catálogo do cliente</h2>
          <p>Localize orientações cadastradas para este cliente por categoria de catálogo.</p>
        </div>
        <Link className={styles.manageLink} href="/catalogos" rel="noreferrer" target="_blank">
          Abrir catálogos
        </Link>
      </div>

      <form className={styles.locator} onSubmit={locate}>
        <label>
          <span>Categoria do catálogo</span>
          <select
            disabled={loadingFilters || loadingCatalogs}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setCatalogs([]);
              setSelectedId(null);
              setFeedback(null);
              setError(null);
            }}
            required
            value={categoryId}
          >
            <option value="">Selecione</option>
            {filters?.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <button disabled={loadingCatalogs || !categoryId} type="submit">
          {loadingCatalogs ? 'Localizando…' : 'Localizar catálogo'}
        </button>
      </form>

      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {feedback ? <div className={styles.feedback} role="status">{feedback}</div> : null}

      {catalogs.length > 1 ? (
        <div className={styles.choices}>
          {catalogs.map((catalog) => (
            <button
              className={styles.choice}
              data-active={catalog.id === selectedId}
              key={catalog.id}
              onClick={() => setSelectedId(catalog.id)}
              type="button"
            >
              <strong>{catalog.title}</strong>
              <span>{sectorLabel(catalog.sector)} · {catalog.categoryName ?? `Categoria #${catalog.categoryId}`}</span>
            </button>
          ))}
        </div>
      ) : null}

      {selected ? (
        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <div>
              <span>{sectorLabel(selected.sector)} · {selected.categoryName ?? `Categoria #${selected.categoryId}`}</span>
              <h3>{selected.title}</h3>
            </div>
            <small>Catálogo #{selected.id}</small>
          </div>
          <iframe
            className={styles.frame}
            sandbox=""
            srcDoc={selected.content}
            title={`Catálogo ${selected.title}`}
          />
        </div>
      ) : null}
    </section>
  );
}

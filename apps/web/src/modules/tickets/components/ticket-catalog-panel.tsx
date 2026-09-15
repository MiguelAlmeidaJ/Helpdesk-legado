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
import styles from './ticket-catalog-panel.module.css';

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
        <Link className={styles.manageLink} href="/catalog" rel="noreferrer" target="_blank">
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

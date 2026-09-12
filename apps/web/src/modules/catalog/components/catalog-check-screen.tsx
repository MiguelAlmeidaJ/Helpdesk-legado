'use client';

import type {
  CatalogFiltersResponse,
  CatalogListItem,
  CatalogSector,
  CurrentUserResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { fetchAllCatalogs, fetchCatalogFilters } from '../api/catalog-api';
import styles from './catalog-check-screen.module.css';

function apiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.body && typeof error.body === 'object') {
      const value = (error.body as Record<string, unknown>).message;
      if (typeof value === 'string') return value;
    }
    if (error.status === 403) return 'Seu usuário não possui acesso ao catálogo.';
    return `A API respondeu com erro ${error.status}.`;
  }
  return error instanceof Error ? error.message : 'Não foi possível carregar a verificação.';
}

function sectorLabel(sector: CatalogSector): string {
  return sector === 1 ? 'TI' : 'DevOps';
}

export function CatalogCheckScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const [filters, setFilters] = useState<CatalogFiltersResponse | null>(null);
  const [catalogs, setCatalogs] = useState<CatalogListItem[]>([]);
  const [sector, setSector] = useState<'' | CatalogSector>('');
  const [categoryId, setCategoryId] = useState('');
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      fetchCatalogFilters(controller.signal),
      fetchAllCatalogs(controller.signal),
    ])
      .then(([nextFilters, nextCatalogs]) => {
        setFilters(nextFilters);
        setCatalogs(nextCatalogs);
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.name === 'AbortError') return;
        setError(apiMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const categories = useMemo(
    () =>
      (filters?.categories ?? []).filter(
        (category) => !categoryId || category.id === Number(categoryId),
      ),
    [categoryId, filters],
  );

  const clients = useMemo(
    () =>
      (filters?.clients ?? []).filter(
        (client) => !clientId || client.id === Number(clientId),
      ),
    [clientId, filters],
  );

  const coverage = useMemo(() => {
    const result = new Map<string, Set<CatalogSector>>();

    for (const catalog of catalogs) {
      if (sector && catalog.sector !== sector) continue;
      const key = `${catalog.clientId}:${catalog.categoryId}`;
      const sectors = result.get(key) ?? new Set<CatalogSector>();
      sectors.add(catalog.sector);
      result.set(key, sectors);
    }

    return result;
  }, [catalogs, sector]);

  const visibleCoverageCount = useMemo(
    () =>
      clients.reduce(
        (count, client) =>
          count +
          categories.filter((category) => coverage.has(`${client.id}:${category.id}`)).length,
        0,
      ),
    [categories, clients, coverage],
  );

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
            <h1>Verificação de Catálogos</h1>
            <p>Confira a cobertura de catálogo por cliente, categoria e setor permitido.</p>
          </div>
          <Link className="button" href="/catalog">Gerenciar catálogos</Link>
        </div>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        {loading ? <div className="loading-line" aria-label="Carregando" /> : null}

        <section className={styles.card}>
          <div className={styles.filters}>
            <label>
              <span>Setor</span>
              <select
                onChange={(event) => setSector(event.target.value ? Number(event.target.value) as CatalogSector : '')}
                value={sector}
              >
                <option value="">Todos permitidos</option>
                {filters?.allowedSectors.map((value) => (
                  <option key={value} value={value}>{sectorLabel(value)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Categoria</span>
              <select onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
                <option value="">Todas</option>
                {filters?.categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Cliente</span>
              <select onChange={(event) => setClientId(event.target.value)} value={clientId}>
                <option value="">Todos</option>
                {filters?.clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name ?? `Cliente #${client.id}`}</option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.summary}>
            <span>{clients.length} cliente(s)</span>
            <span>{categories.length} categoria(s)</span>
            <span>{visibleCoverageCount} combinação(ões) com catálogo</span>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  {categories.map((category) => <th key={category.id}>{category.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <th scope="row">
                      <strong>{client.name ?? `Cliente #${client.id}`}</strong>
                      <small>#{client.id}</small>
                    </th>
                    {categories.map((category) => {
                      const sectors = coverage.get(`${client.id}:${category.id}`);
                      const labels = [...(sectors ?? [])].sort().map(sectorLabel);
                      return (
                        <td key={category.id}>
                          <span
                            className={sectors?.size ? styles.present : styles.missing}
                            title={labels.length > 0 ? labels.join(', ') : 'Sem catálogo'}
                          >
                            {sectors?.size ? '✓' : '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && clients.length === 0 ? (
              <p className={styles.empty}>Nenhum cliente encontrado para o filtro selecionado.</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

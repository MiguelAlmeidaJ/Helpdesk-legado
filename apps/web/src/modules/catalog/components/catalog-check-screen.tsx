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
const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] border border-app-border-strong bg-app-surface px-4 font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--app-brand-ring)] disabled:cursor-not-allowed disabled:opacity-50';

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
  loadingLine:
    'mb-3 h-[3px] overflow-hidden rounded-full bg-app-border after:block after:h-full after:w-1/3 after:animate-pulse after:rounded-full after:bg-app-brand',
  card:
    'overflow-hidden rounded-[14px] border border-app-border bg-app-surface shadow-sm shadow-slate-950/5 dark:shadow-black/10',
  filters:
    'grid grid-cols-1 gap-3.5 border-b border-app-border-soft bg-app-surface-muted p-[18px] min-[801px]:grid-cols-3 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-[13px] [&_label]:font-bold [&_label]:text-app-text-soft [&_select]:min-h-10 [&_select]:w-full [&_select]:rounded-[9px] [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-2.5 [&_select]:py-2 [&_select]:text-app-text [&_select]:outline-none [&_select]:transition [&_select:focus]:border-app-brand [&_select:focus]:ring-3 [&_select:focus]:ring-[var(--app-brand-ring)]',
  summary:
    'flex flex-wrap gap-2 border-b border-app-border-soft px-[18px] py-3 [&_span]:rounded-full [&_span]:bg-app-surface-muted [&_span]:px-[9px] [&_span]:py-1.5 [&_span]:text-xs [&_span]:font-bold [&_span]:text-app-muted',
  tableWrap: 'relative max-h-[calc(100vh_-_310px)] overflow-auto max-[800px]:max-h-none',
  table: 'w-full min-w-[760px] border-separate border-spacing-0',
  headerCell:
    'sticky top-0 z-20 border-r border-b border-app-border-soft bg-app-surface-muted px-3 py-2.5 text-center text-xs font-extrabold text-app-muted first:left-0 first:z-30 first:min-w-[230px] first:text-left',
  rowHeader:
    'sticky left-0 z-10 min-w-[230px] border-r border-b border-app-border-soft bg-app-surface px-3 py-2.5 text-left [&_strong]:block [&_strong]:text-app-text [&_small]:mt-0.5 [&_small]:block [&_small]:font-medium [&_small]:text-app-subtle',
  cell: 'border-r border-b border-app-border-soft px-3 py-2.5 text-center',
  present:
    'inline-flex size-7 items-center justify-center rounded-full border border-emerald-300/70 bg-emerald-50 font-extrabold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300',
  missing:
    'inline-flex size-7 items-center justify-center rounded-full border border-app-border bg-app-surface-muted font-extrabold text-app-subtle',
  error:
    'mb-4 rounded-[10px] border border-app-danger-border bg-app-danger-soft px-3.5 py-3 text-app-danger',
  empty: 'm-0 px-[18px] py-[30px] text-center text-app-muted',
} as const;


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
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <AppSidebar />
          <Link className={styles.brand} href="/dashboard">
            <strong>Helpdesk</strong>
            <span>Nova plataforma</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <div>
            <span className={styles.eyebrow}>Cadastros</span>
            <h1>Verificação de Catálogos</h1>
            <p>Confira a cobertura de catálogo por cliente, categoria e setor permitido.</p>
          </div>
          <Link className={styles.button} href="/catalog">Gerenciar catálogos</Link>
        </div>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        {loading ? <div className={styles.loadingLine} aria-label="Carregando" /> : null}

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
                  <th className={styles.headerCell}>Cliente</th>
                  {categories.map((category) => <th className={styles.headerCell} key={category.id}>{category.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <th className={styles.rowHeader} scope="row">
                      <strong>{client.name ?? `Cliente #${client.id}`}</strong>
                      <small>#{client.id}</small>
                    </th>
                    {categories.map((category) => {
                      const sectors = coverage.get(`${client.id}:${category.id}`);
                      const labels = [...(sectors ?? [])].sort().map(sectorLabel);
                      return (
                        <td className={styles.cell} key={category.id}>
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

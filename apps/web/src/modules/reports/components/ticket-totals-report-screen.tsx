'use client';

import type { CurrentUserResponse } from '@helpdesk/contracts';
import Link from 'next/link';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import styles from './ticket-client-totals-report-screen.module.css';
import { downloadCsv } from '../lib/report-export';

export type TicketTotalsLevel = 0 | 1 | 2 | 3;

export interface TicketTotalsReportFilters {
  startDate?: string;
  endDate?: string;
  level?: TicketTotalsLevel;
}

export interface TicketTotalsReportViewRow {
  id: number;
  name: string;
  level1: number;
  level2: number;
  level3: number;
  total: number;
}

export interface TicketTotalsReportViewResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  level: TicketTotalsLevel;
  total: number;
  rows: TicketTotalsReportViewRow[];
}

interface TicketTotalsReportScreenProps {
  currentUser: CurrentUserResponse;
  title: string;
  description: string;
  emptyMessage: string;
  loadErrorMessage: string;
  loadReport: (
    filters?: TicketTotalsReportFilters,
  ) => Promise<TicketTotalsReportViewResponse>;
}

function percentage(value: number, total: number): string {
  if (total <= 0 || value <= 0) return '0%';
  return `${(value / total) * 100}%`;
}

function TotalsBar({
  row,
  maxTotal,
}: {
  row: TicketTotalsReportViewRow;
  maxTotal: number;
}) {
  const width = maxTotal > 0 ? Math.max(2, (row.total / maxTotal) * 100) : 0;

  return (
    <div className={styles.barTrack} aria-label={`${row.total} atendimentos`}>
      <div className={styles.barTotal} style={{ width: `${width}%` }}>
        {row.level1 > 0 ? (
          <span
            className={styles.level1}
            style={{ width: percentage(row.level1, row.total) }}
            title={`Nível 1: ${row.level1}`}
          />
        ) : null}
        {row.level2 > 0 ? (
          <span
            className={styles.level2}
            style={{ width: percentage(row.level2, row.total) }}
            title={`Nível 2: ${row.level2}`}
          />
        ) : null}
        {row.level3 > 0 ? (
          <span
            className={styles.level3}
            style={{ width: percentage(row.level3, row.total) }}
            title={`Nível 3: ${row.level3}`}
          />
        ) : null}
      </div>
    </div>
  );
}

export function TicketTotalsReportScreen({
  currentUser,
  title,
  description,
  emptyMessage,
  loadErrorMessage,
  loadReport,
}: TicketTotalsReportScreenProps) {
  const [data, setData] = useState<TicketTotalsReportViewResponse | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [level, setLevel] = useState<TicketTotalsLevel>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (filters: TicketTotalsReportFilters = {}) => {
      try {
        setLoading(true);
        setError(null);
        const response = await loadReport(filters);
        setData(response);
        setStartDate(response.period.startDate);
        setEndDate(response.period.endDate);
        setLevel(response.level);
      } catch (reason: unknown) {
        setData(null);
        if (reason instanceof ApiError && reason.status === 401) {
          setError('Sua sessão expirou. Entre novamente.');
        } else if (reason instanceof ApiError && reason.status === 403) {
          setError('Seu usuário não possui acesso aos relatórios de atendimento.');
        } else {
          setError(loadErrorMessage);
        }
      } finally {
        setLoading(false);
      }
    },
    [loadErrorMessage, loadReport],
  );

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const selectedLevel = Number(query.get('level') ?? 0);
    void load({ startDate: query.get('startDate') ?? undefined, endDate: query.get('endDate') ?? undefined, level: ([0, 1, 2, 3].includes(selectedLevel) ? selectedLevel : 0) as TicketTotalsLevel });
  }, [load]);

  const maxTotal = useMemo(
    () => Math.max(0, ...(data?.rows.map((row) => row.total) ?? [])),
    [data?.rows],
  );

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load({ startDate, endDate, level });
  }

  function clear() {
    void load({ level: 0 });
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <AppSidebar />
          <Link className={styles.brand} href="/dashboard">
            <strong>Helpdesk</strong>
            <span>Relatórios</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Atendimentos</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className={styles.summary}>
            <span>Total no período</span>
            <strong>{data?.total ?? 0}</strong>
          </div>
        </section>

        {data ? <p className={styles.printHeading}>{data.period.startDate} a {data.period.endDate} · Nível {data.level || 'Todos (1–3)'}</p> : null}

        <form className={styles.filters} onSubmit={apply}>
          <label>
            <span>De</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </label>
          <label>
            <span>Até</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </label>
          <label>
            <span>Nível</span>
            <select
              value={level}
              onChange={(event) =>
                setLevel(Number(event.target.value) as TicketTotalsLevel)
              }
            >
              <option value={0}>Todos</option>
              <option value={1}>Nível 1</option>
              <option value={2}>Nível 2</option>
              <option value={3}>Nível 3</option>
            </select>
          </label>
          <div className={styles.actions}>
            <button type="submit" disabled={loading}>
              {loading ? 'Atualizando…' : 'Filtrar'}
            </button>
            <button type="button" className={styles.secondary} onClick={clear} disabled={loading}>
              Limpar
            </button>
          </div>
        </form>

        {data && !loading && !error ? <div className={styles.exportActions}>
          <span>{data.period.startDate} a {data.period.endDate} · Nível: {data.level || 'Todos (1–3)'}</span>
          <button type="button" onClick={() => downloadCsv(`relatorio-${data.period.startDate}-${data.period.endDate}.csv`, [
            [title, 'Nível 1', 'Nível 2', 'Nível 3', 'Total'],
            ...data.rows.map(row => [row.name, row.level1, row.level2, row.level3, row.total]),
            ['Total', ...[1, 2, 3].map(n => data.rows.reduce((sum, row) => sum + (n === 1 ? row.level1 : n === 2 ? row.level2 : row.level3), 0)), data.total],
          ])}>Exportar CSV</button>
          <button type="button" onClick={() => window.print()}>Imprimir / Salvar PDF</button>
        </div> : null}

        <div className={styles.legend} aria-label="Legenda dos níveis">
          <span><i className={styles.level1} /> Nível 1</span>
          <span><i className={styles.level2} /> Nível 2</span>
          <span><i className={styles.level3} /> Nível 3</span>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <section className={styles.reportCard}>
          {loading && !data ? (
            <div className={styles.empty}>Carregando relatório…</div>
          ) : data?.rows.length ? (
            <div className={styles.rows}>
              {data.rows.map((row) => (
                <article className={styles.row} key={row.id}>
                  <div className={styles.rowHeader}>
                    <strong>{row.name}</strong>
                    <b>{row.total}</b>
                  </div>
                  <TotalsBar row={row} maxTotal={maxTotal} />
                  <div className={styles.breakdown}>
                    <span>N1 <b>{row.level1}</b></span>
                    <span>N2 <b>{row.level2}</b></span>
                    <span>N3 <b>{row.level3}</b></span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>{emptyMessage}</div>
          )}
        </section>
      </div>
    </main>
  );
}

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
const styles = {
  page: 'min-h-screen bg-app-bg text-app-text print:bg-white print:text-black',
  header:
    'sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-5 border-b border-app-border bg-app-surface px-7 py-3 max-[820px]:px-4 print:hidden',
  headerLeft: 'flex items-center gap-3.5',
  brand:
    'flex flex-col text-inherit no-underline [&_strong]:text-base [&_span]:text-[0.78rem] [&_span]:text-app-muted-strong max-[520px]:[&_span]:hidden',
  content:
    'mx-auto w-[calc(100%_-_32px)] max-w-[1180px] pt-8 pb-14 max-[820px]:w-[calc(100%_-_22px)] max-[820px]:pt-[22px] print:w-full print:max-w-none print:p-0',
  hero:
    'mb-[22px] flex items-end justify-between gap-6 max-[820px]:flex-col max-[820px]:items-stretch print:block [&_h1]:mt-1 [&_h1]:mb-2 [&_h1]:text-[clamp(1.8rem,4vw,2.6rem)] [&_h1]:leading-[1.05] print:[&_h1]:text-[20pt] [&_p]:m-0 [&_p]:max-w-[720px] [&_p]:leading-[1.55] [&_p]:text-app-muted-strong',
  eyebrow:
    'text-[0.78rem] font-extrabold uppercase tracking-[0.08em] text-app-brand',
  summary:
    'min-w-[180px] rounded-2xl bg-slate-900 px-[18px] py-4 text-white max-[820px]:min-w-0 dark:bg-slate-950 print:bg-white print:p-0 print:text-black [&_span]:block [&_span]:text-[0.78rem] [&_span]:opacity-70 [&_strong]:mt-1 [&_strong]:block [&_strong]:text-2xl print:[&_strong]:text-[14pt]',
  filters:
    'grid grid-cols-[repeat(3,minmax(150px,1fr))_auto] items-end gap-3.5 rounded-2xl border border-app-border bg-app-surface p-[18px] shadow-[0_12px_30px_rgba(38,52,77,0.06)] max-[820px]:grid-cols-2 max-[520px]:grid-cols-1 dark:shadow-black/10 print:hidden [&_label]:grid [&_label]:gap-[7px] [&_label>span]:text-[0.78rem] [&_label>span]:font-bold [&_label>span]:text-app-muted [&_input]:min-h-[42px] [&_input]:w-full [&_input]:rounded-[10px] [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-3 [&_input]:text-app-text [&_input]:outline-none [&_input]:transition [&_select]:min-h-[42px] [&_select]:w-full [&_select]:rounded-[10px] [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-3 [&_select]:text-app-text [&_select]:outline-none [&_select]:transition [&_input:focus]:border-app-brand [&_input:focus]:ring-3 [&_input:focus]:ring-[var(--app-brand-ring)] [&_select:focus]:border-app-brand [&_select:focus]:ring-3 [&_select:focus]:ring-[var(--app-brand-ring)]',
  actions:
    'flex gap-2 max-[820px]:col-span-2 max-[520px]:col-span-1 [&_button]:min-h-[42px] [&_button]:cursor-pointer [&_button]:rounded-[10px] [&_button]:border-0 [&_button]:bg-app-brand [&_button]:px-4 [&_button]:font-extrabold [&_button]:text-white [&_button]:transition [&_button:hover]:bg-app-brand-hover dark:[&_button]:text-slate-950 max-[520px]:[&_button]:flex-1 [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-65',
  secondary:
    '!bg-app-surface-muted !text-app-text-soft hover:!bg-app-surface-hover dark:!text-app-text-soft',
  legend:
    'mx-0.5 mt-[18px] mb-2.5 flex flex-wrap gap-[18px] text-[0.82rem] text-app-muted print:hidden [&_span]:inline-flex [&_span]:items-center [&_span]:gap-[7px] [&_i]:size-[11px] [&_i]:rounded-[3px]',
  level1: 'bg-indigo-600 dark:bg-indigo-400',
  level2: 'bg-amber-500 dark:bg-amber-400',
  level3: 'bg-rose-600 dark:bg-rose-400',
  error:
    'my-3.5 rounded-xl border border-app-danger-border bg-app-danger-soft px-4 py-3.5 text-app-danger',
  reportCard:
    'mt-3 overflow-hidden rounded-[18px] border border-app-border bg-app-surface shadow-[0_14px_36px_rgba(38,52,77,0.07)] dark:shadow-black/10 print:overflow-visible print:border-0 print:shadow-none',
  rows: 'grid',
  row:
    'border-b border-app-border-soft px-5 py-[18px] last:border-b-0 print:break-inside-avoid print:px-0 print:py-3',
  rowHeader:
    'mb-[9px] flex items-center justify-between gap-4 [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap print:[&_strong]:whitespace-normal [&_b]:min-w-[42px] [&_b]:text-right [&_b]:text-[1.05rem]',
  barTrack:
    'h-[18px] w-full overflow-hidden rounded-full bg-app-border-soft print:[print-color-adjust:exact]',
  barTotal:
    'flex h-full overflow-hidden rounded-[inherit] transition-[width] duration-200 [&>span]:block [&>span]:h-full',
  breakdown:
    'mt-[7px] flex gap-3.5 text-[0.76rem] text-app-subtle [&_b]:text-app-text-soft',
  empty: 'px-6 py-[54px] text-center text-app-muted-strong',
  exportActions:
    'my-[18px] flex flex-wrap items-center gap-3 print:hidden [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-3.5 [&_button]:py-2.5 [&_button]:text-app-text [&_button]:transition [&_button:hover]:bg-app-surface-hover [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-50',
  printHeading: 'hidden print:block',
} as const;
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
          <Link className={styles.brand} href="/painel">
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

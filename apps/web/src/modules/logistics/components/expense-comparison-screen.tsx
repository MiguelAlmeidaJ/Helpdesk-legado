"use client";

import type {
  CurrentUserResponse,
  LogisticsExpenseComparisonGroup,
  LogisticsExpenseComparisonResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import {
  type ExpenseComparisonFilters,
  getExpenseComparison,
} from '../api/expense-comparison-api';
const styles = {
  page: 'min-h-screen bg-app-bg text-app-text',
  header:
    'sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-app-border bg-[var(--app-header-bg)] px-7 backdrop-blur-xl max-[760px]:px-3.5',
  headerLeft: 'flex items-center gap-3.5',
  brand:
    'flex flex-col text-inherit no-underline [&_span]:text-[0.78rem] [&_span]:text-app-muted',
  content:
    'mx-auto w-[min(1500px,calc(100%-48px))] py-7 pb-12 max-[760px]:w-[min(1500px,calc(100%-24px))] max-[760px]:pt-5',
  hero:
    'mb-[18px] flex items-end justify-between gap-6 max-[760px]:flex-col max-[760px]:items-start [&_h1]:mt-[5px] [&_h1]:mb-1.5 [&_h1]:text-[clamp(1.7rem,3vw,2.35rem)] [&_p]:m-0 [&_p]:text-app-muted',
  eyebrow:
    'text-[0.76rem] font-extrabold uppercase tracking-[0.05em] text-app-muted',
  heroActions:
    'flex flex-wrap justify-end gap-2 max-[760px]:justify-start [&_a]:inline-flex [&_a]:min-h-10 [&_a]:items-center [&_a]:rounded-lg [&_a]:border [&_a]:border-app-border-strong [&_a]:bg-app-surface [&_a]:px-3.5 [&_a]:font-extrabold [&_a]:text-app-brand [&_a]:no-underline [&_a]:transition [&_a:hover]:bg-app-surface-hover',
  notice:
    'mb-[18px] flex flex-col gap-1 rounded-[10px] border border-sky-200 bg-sky-50 px-[15px] py-[13px] text-slate-700 dark:border-sky-900/70 dark:bg-sky-950/35 dark:text-sky-100 [&_span]:text-[0.88rem] [&_span]:text-slate-600 dark:[&_span]:text-sky-200',
  filters:
    'mb-[18px] flex flex-wrap items-end gap-3.5 rounded-xl border border-app-border bg-app-surface p-4 max-[760px]:w-full max-[760px]:flex-col max-[760px]:items-stretch [&_fieldset]:flex [&_fieldset]:min-w-[290px] [&_fieldset]:gap-2.5 [&_fieldset]:rounded-[9px] [&_fieldset]:border [&_fieldset]:border-app-border [&_fieldset]:px-3 [&_fieldset]:pt-2.5 [&_fieldset]:pb-3 max-[760px]:[&_fieldset]:w-full max-[760px]:[&_fieldset]:min-w-0 max-[760px]:[&_fieldset]:flex-col max-[760px]:[&_fieldset]:items-stretch [&_legend]:px-[5px] [&_legend]:text-[0.78rem] [&_legend]:font-extrabold [&_legend]:text-app-muted [&_label]:flex [&_label]:flex-col [&_label]:gap-[5px] [&_label]:text-[0.78rem] [&_label]:font-extrabold [&_input]:min-h-10 [&_input]:rounded-[7px] [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-[9px] [&_input]:py-[7px] [&_input]:text-app-text [&_input]:outline-none [&_input:focus]:border-app-brand [&_input:focus]:ring-[3px] [&_input:focus]:ring-[var(--app-brand-ring)] [&_select]:min-h-10 [&_select]:rounded-[7px] [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-[9px] [&_select]:py-[7px] [&_select]:text-app-text [&_select]:outline-none [&_select:focus]:border-app-brand [&_select:focus]:ring-[3px] [&_select:focus]:ring-[var(--app-brand-ring)] [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:rounded-[7px] [&_button]:border [&_button]:border-app-brand [&_button]:bg-app-brand [&_button]:px-[18px] [&_button]:py-[7px] [&_button]:font-extrabold [&_button]:text-white max-[760px]:[&_button]:w-full [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-[0.65]',
  alertField: 'min-w-[190px] max-[760px]:min-w-0',
  error:
    'mb-[18px] rounded-[9px] border border-app-danger-border bg-app-danger-soft px-[15px] py-[13px] text-app-danger',
  loading:
    'mb-[18px] rounded-[9px] border border-app-border bg-app-surface px-[15px] py-[13px] text-app-muted',
  metrics:
    'mb-[18px] grid grid-cols-4 gap-3.5 max-[1050px]:grid-cols-2 max-[760px]:grid-cols-1 [&_article]:flex [&_article]:min-h-[120px] [&_article]:flex-col [&_article]:gap-[5px] [&_article]:rounded-[11px] [&_article]:border [&_article]:border-app-border [&_article]:bg-app-surface [&_article]:p-4 [&_article_span]:text-[0.77rem] [&_article_span]:font-extrabold [&_article_span]:uppercase [&_article_span]:text-app-muted [&_article_strong]:text-[1.45rem] [&_article_small]:mt-auto [&_article_small]:text-app-subtle [&_article[data-direction=up]_strong]:text-red-700 dark:[&_article[data-direction=up]_strong]:text-red-300 [&_article[data-direction=down]_strong]:text-emerald-700 dark:[&_article[data-direction=down]_strong]:text-emerald-300',
  tablesGrid:
    'grid grid-cols-2 gap-[18px] max-[1050px]:grid-cols-2 max-[760px]:grid-cols-1',
  tableCard:
    'min-w-0 overflow-hidden rounded-xl border border-app-border bg-app-surface [&>header]:flex [&>header]:items-baseline [&>header]:justify-between [&>header]:gap-3 [&>header]:border-b [&>header]:border-app-border-soft [&>header]:px-4 [&>header]:py-[15px] [&_h2]:m-0 [&_h2]:text-[1.05rem] [&_header_span]:text-[0.78rem] [&_header_span]:text-app-subtle',
  tableWrap:
    'max-h-[560px] overflow-auto [&_table]:w-full [&_table]:border-collapse [&_table]:text-[0.82rem] [&_th]:border-b [&_th]:border-app-border-soft [&_th]:px-[11px] [&_th]:py-2.5 [&_th]:text-right [&_th]:whitespace-nowrap [&_td]:border-b [&_td]:border-app-border-soft [&_td]:px-[11px] [&_td]:py-2.5 [&_td]:text-right [&_td]:whitespace-nowrap [&_th:first-child]:min-w-[180px] [&_th:first-child]:text-left [&_th:first-child]:whitespace-normal [&_td:first-child]:min-w-[180px] [&_td:first-child]:text-left [&_td:first-child]:whitespace-normal [&_th]:sticky [&_th]:top-0 [&_th]:z-[1] [&_th]:bg-app-surface-muted [&_th]:text-app-text-soft [&_tr[data-highlight=true]_td]:bg-amber-100 dark:[&_tr[data-highlight=true]_td]:bg-amber-950/40 [&_td[data-direction=up]]:text-red-700 dark:[&_td[data-direction=up]]:text-red-300 [&_td[data-direction=down]]:text-emerald-700 dark:[&_td[data-direction=down]]:text-emerald-300',
  emptyCell: 'p-6! text-center! text-app-subtle',
} as const;

const ALERT_OPTIONS = [0, 10, 20, 30, 50, 75, 100, 150, 200];
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const percent = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function errorMessage(reason: unknown): string {
  if (
    reason &&
    typeof reason === 'object' &&
    'body' in reason &&
    reason.body &&
    typeof reason.body === 'object' &&
    'message' in reason.body
  ) {
    const value = (reason.body as { message?: unknown }).message;
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(' ');
  }
  return 'Não foi possível carregar a análise comparativa.';
}

function direction(value: number): 'up' | 'down' | 'neutral' {
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'neutral';
}

function variationLabel(value: number): string {
  if (value > 0) return `↑ ${percent.format(value)}%`;
  if (value < 0) return `↓ ${percent.format(value)}%`;
  return `— ${percent.format(value)}%`;
}

function ComparisonTable({
  title,
  rows,
  period1Label,
  period2Label,
  percentAlert,
}: {
  title: string;
  rows: LogisticsExpenseComparisonGroup[];
  period1Label: string;
  period2Label: string;
  percentAlert: number;
}) {
  return (
    <section className={styles.tableCard}>
      <header>
        <h2>{title}</h2>
        <span>{rows.length} agrupamento(s)</span>
      </header>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>{period1Label}</th>
              <th>{period2Label}</th>
              <th>Diferença</th>
              <th>Variação</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className={styles.emptyCell} colSpan={5}>
                  Nenhuma despesa paga encontrada nesses períodos.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  data-highlight={
                    percentAlert > 0 && row.variationPercent >= percentAlert
                  }
                  key={row.label}
                >
                  <td>{row.label}</td>
                  <td>{currency.format(row.period1Amount)}</td>
                  <td>{currency.format(row.period2Amount)}</td>
                  <td data-direction={direction(row.difference)}>
                    {currency.format(row.difference)}
                  </td>
                  <td data-direction={direction(row.variationPercent)}>
                    {variationLabel(row.variationPercent)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ExpenseComparisonScreen({
  currentUser,
  initialFilters,
}: {
  currentUser: CurrentUserResponse;
  initialFilters: ExpenseComparisonFilters;
}) {
  const [report, setReport] =
    useState<LogisticsExpenseComparisonResponse | null>(null);
  const [period1Start, setPeriod1Start] = useState(
    initialFilters.period1Start ?? '',
  );
  const [period1End, setPeriod1End] = useState(initialFilters.period1End ?? '');
  const [period2Start, setPeriod2Start] = useState(
    initialFilters.period2Start ?? '',
  );
  const [period2End, setPeriod2End] = useState(initialFilters.period2End ?? '');
  const [percentAlert, setPercentAlert] = useState(
    initialFilters.percentAlert ?? 50,
  );
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async (filters: ExpenseComparisonFilters) => {
    try {
      setLoading(true);
      setFeedback('');
      const response = await getExpenseComparison(filters);
      setReport(response);
      setPeriod1Start(response.periods.period1.startDate);
      setPeriod1End(response.periods.period1.endDate);
      setPeriod2Start(response.periods.period2.startDate);
      setPeriod2End(response.periods.period2.endDate);
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(initialFilters);
  }, [initialFilters, load]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load({ period1Start, period1End, period2Start, period2End });
  }

  const period1Label = report
    ? `${report.periods.period1.startDate} → ${report.periods.period1.endDate}`
    : 'Período 1';
  const period2Label = report
    ? `${report.periods.period2.startDate} → ${report.periods.period2.endDate}`
    : 'Período 2';

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <AppSidebar />
          <Link className={styles.brand} href="/dashboard">
            <strong>Helpdesk</strong>
            <span>Logística · Análise de RDs</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Logística · Administrativo</span>
            <h1>Análise Comparativa de Despesas</h1>
            <p>Compare RDs pagas por categoria e cliente entre dois períodos.</p>
          </div>
          <div className={styles.heroActions}>
            <Link href="/logistics/expenses/admin/report">Relatório de pagamentos</Link>
            <Link href="/logistics/expenses/admin">Voltar à gestão</Link>
          </div>
        </section>

        <section className={styles.notice}>
          <strong>Comparação nativa sobre RDs pagas e ativas.</strong>
          <span>
            Os períodos são ordenados cronologicamente e categorias respeitam o
            corte de catálogo de 01/10/2025. Despesas sem cliente aparecem como
            “Sem cliente”, mantendo os totais conciliados.
          </span>
        </section>

        <form className={styles.filters} onSubmit={submit}>
          <fieldset>
            <legend>Período 1</legend>
            <label>
              De
              <input
                type="date"
                value={period1Start}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setPeriod1Start(event.target.value)
                }
              />
            </label>
            <label>
              Até
              <input
                type="date"
                value={period1End}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setPeriod1End(event.target.value)
                }
              />
            </label>
          </fieldset>
          <fieldset>
            <legend>Período 2</legend>
            <label>
              De
              <input
                type="date"
                value={period2Start}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setPeriod2Start(event.target.value)
                }
              />
            </label>
            <label>
              Até
              <input
                type="date"
                value={period2End}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setPeriod2End(event.target.value)
                }
              />
            </label>
          </fieldset>
          <label className={styles.alertField}>
            Destacar aumento maior que
            <select
              value={percentAlert}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setPercentAlert(Number(event.target.value))
              }
            >
              {ALERT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}%
                </option>
              ))}
            </select>
          </label>
          <button disabled={loading} type="submit">
            {loading ? 'Analisando…' : 'Analisar'}
          </button>
        </form>

        {feedback ? <div className={styles.error}>{feedback}</div> : null}

        {report ? (
          <>
            <section className={styles.metrics}>
              <article>
                <span>Período 1</span>
                <strong>{currency.format(report.totals.period1Amount)}</strong>
                <small>{period1Label}</small>
              </article>
              <article>
                <span>Período 2</span>
                <strong>{currency.format(report.totals.period2Amount)}</strong>
                <small>{period2Label}</small>
              </article>
              <article data-direction={direction(report.totals.variationPercent)}>
                <span>Variação geral</span>
                <strong>{variationLabel(report.totals.variationPercent)}</strong>
                <small>Período 2 contra Período 1</small>
              </article>
              <article data-direction={direction(report.totals.difference)}>
                <span>Diferença</span>
                <strong>{currency.format(report.totals.difference)}</strong>
                <small>Valor absoluto entre os períodos</small>
              </article>
            </section>

            <div className={styles.tablesGrid}>
              <ComparisonTable
                period1Label={period1Label}
                period2Label={period2Label}
                percentAlert={percentAlert}
                rows={report.categories}
                title="Análise por Categoria"
              />
              <ComparisonTable
                period1Label={period1Label}
                period2Label={period2Label}
                percentAlert={percentAlert}
                rows={report.clients}
                title="Análise por Cliente"
              />
            </div>
          </>
        ) : loading ? (
          <div className={styles.loading}>Carregando análise…</div>
        ) : null}
      </div>
    </main>
  );
}

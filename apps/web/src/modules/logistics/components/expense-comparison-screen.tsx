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
import styles from './expense-comparison-screen.module.css';

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

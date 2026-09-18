"use client";

import {
  AppPermission,
  type CurrentUserResponse,
  type LogisticsExpenseAdminBreakdownItem,
  type LogisticsExpenseAdminDashboardResponse,
  type LogisticsExpenseAdminDetailsResponse,
  type LogisticsExpenseAdminGroup,
  type LogisticsExpenseAdminStatus,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import {
  getExpenseAdminDashboard,
  getExpenseAdminDetails,
} from '../api/expense-admin-dashboard-api';
const styles = {
  page: 'min-h-screen bg-app-bg text-app-text',
  header:
    'sticky top-0 z-20 flex min-h-[68px] items-center justify-between border-b border-app-border bg-[var(--app-header-bg)] px-8 backdrop-blur-xl max-[780px]:px-4',
  headerLeft: 'flex items-center gap-4',
  brand:
    'flex flex-col items-start gap-0.5 text-inherit no-underline [&_strong]:text-base [&_span]:text-[0.78rem] [&_span]:uppercase [&_span]:tracking-[0.06em] [&_span]:text-app-muted',
  content:
    'mx-auto w-[min(1500px,calc(100%-40px))] py-8 pb-14 max-[780px]:w-[min(1500px,calc(100%-24px))] max-[780px]:pt-[22px]',
  hero:
    'mb-5 flex items-center justify-between gap-6 max-[780px]:flex-col max-[780px]:items-start [&_h1]:my-1.5 [&_h1]:text-[clamp(1.8rem,4vw,2.7rem)] [&_h1]:tracking-[-0.04em] [&_p]:m-0 [&_p]:text-app-muted',
  eyebrow:
    'text-[0.78rem] uppercase tracking-[0.06em] text-app-muted',
  secondaryLink:
    'rounded-[10px] border border-app-border bg-app-surface px-3.5 py-2.5 font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover',
  notice:
    'mb-[18px] flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3.5 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200 [&_span]:text-amber-800 dark:[&_span]:text-amber-300',
  filters:
    'mb-5 rounded-[14px] border border-app-border bg-app-surface p-4 [&_form]:flex [&_form]:flex-wrap [&_form]:items-center [&_form]:gap-3 max-[780px]:[&_form]:flex-col max-[780px]:[&_form]:items-stretch [&_label]:grid [&_label]:gap-[5px] [&_label]:text-[0.82rem] [&_label]:font-bold [&_label]:text-app-muted [&_input]:min-h-10 [&_input]:rounded-lg [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-2.5 [&_input]:text-app-text [&_input]:outline-none [&_input:focus]:border-app-brand [&_input:focus]:ring-[3px] [&_input:focus]:ring-[var(--app-brand-ring)] [&_button]:min-h-10 [&_button]:self-end [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:border [&_button]:border-app-brand [&_button]:bg-app-brand [&_button]:px-4 [&_button]:font-bold [&_button]:text-white max-[780px]:[&_button]:self-stretch [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-[0.6] [&_small]:mt-2.5 [&_small]:block [&_small]:text-app-subtle',
  feedback:
    'rounded-[10px] border border-app-border bg-app-surface p-[18px] text-center text-app-muted',
  detailFeedback:
    'rounded-[10px] border border-app-border bg-app-surface p-[18px] text-center text-app-muted',
  detailError:
    'rounded-[10px] border border-app-danger-border bg-app-danger-soft p-[18px] text-center text-app-danger',
  metrics:
    'mb-7 grid grid-cols-3 gap-4 max-[780px]:grid-cols-1 [&_article]:flex [&_article]:min-h-[178px] [&_article]:flex-col [&_article]:gap-[9px] [&_article]:rounded-[14px] [&_article]:border [&_article]:border-app-border [&_article]:border-t-4 [&_article]:bg-app-surface [&_article]:p-[18px] [&_article]:shadow-sm [&_article:nth-child(1)]:border-t-amber-500 [&_article:nth-child(2)]:border-t-sky-600 [&_article:nth-child(3)]:border-t-emerald-600 [&_article[data-active=true]]:outline-2 [&_article[data-active=true]]:outline-offset-2 [&_article[data-active=true]]:outline-app-text-soft [&_article>span]:text-[0.78rem] [&_article>span]:font-extrabold [&_article>span]:uppercase [&_article>span]:tracking-[0.05em] [&_article>span]:text-app-muted [&_article>strong]:text-[clamp(1.5rem,3vw,2.1rem)] [&_article>small]:min-h-[34px] [&_article>small]:leading-[1.4] [&_article>small]:text-app-subtle [&_article_button]:min-h-10 [&_article_button]:w-fit [&_article_button]:cursor-pointer [&_article_button]:rounded-lg [&_article_button]:border [&_article_button]:border-app-border-strong [&_article_button]:bg-app-surface [&_article_button]:px-4 [&_article_button]:font-bold [&_article_button]:text-app-text-soft [&_article_button]:transition [&_article_button:hover]:bg-app-surface-hover [&_article_button:disabled]:cursor-wait [&_article_button:disabled]:opacity-[0.6]',
  metricActions: 'mt-auto flex flex-wrap gap-2',
  approvalLink:
    'inline-flex min-h-10 items-center rounded-lg border border-emerald-700 bg-emerald-700 px-3.5 font-extrabold text-white no-underline transition hover:bg-emerald-800 dark:border-emerald-600 dark:bg-emerald-700 dark:hover:bg-emerald-600',
  paymentLink:
    'inline-flex min-h-10 items-center rounded-lg border border-emerald-700 bg-emerald-700 px-3.5 font-extrabold text-white no-underline transition hover:bg-emerald-800 dark:border-emerald-600 dark:bg-emerald-700 dark:hover:bg-emerald-600',
  reportLink:
    'inline-flex min-h-10 items-center rounded-lg border border-emerald-700 bg-emerald-700 px-3.5 font-extrabold text-white no-underline transition hover:bg-emerald-800 dark:border-emerald-600 dark:bg-emerald-700 dark:hover:bg-emerald-600',
  summaryHeader:
    'mb-3.5 text-center [&_h2]:mt-[5px] [&_h2]:mb-0 [&_h2]:text-[1.35rem]',
  breakdownGrid:
    'grid grid-cols-3 items-start gap-4 max-[1100px]:grid-cols-1',
  breakdownPanel:
    'overflow-hidden rounded-[14px] border border-app-border bg-app-surface shadow-sm [&>header]:flex [&>header]:items-center [&>header]:justify-between [&>header]:gap-4 [&>header]:bg-app-text-soft [&>header]:px-[18px] [&>header]:py-4 [&>header]:text-app-surface [&>header_h2]:mt-0.5 [&>header_h2]:mb-0 [&>header_h2]:text-base [&>header_span]:text-[0.78rem] [&>header_span]:uppercase [&>header_span]:tracking-[0.06em] [&>header_span]:text-slate-300 [&>header>strong]:whitespace-nowrap',
  breakdownRows:
    'max-h-[580px] overflow-auto max-[1100px]:max-h-none',
  breakdownEntry: 'border-b border-app-border-soft last:border-b-0',
  breakdownButton:
    'flex w-full cursor-pointer items-center gap-2.5 border-0 bg-app-surface px-3.5 py-[13px] text-left text-app-text-soft transition hover:bg-app-surface-hover aria-expanded:bg-app-surface-hover',
  expandIcon:
    'inline-grid size-6 flex-none place-items-center rounded-full bg-app-brand-soft text-[1.1rem] font-extrabold text-app-brand',
  breakdownLabel: 'flex-1 [overflow-wrap:anywhere]',
  detailArea:
    'border-t border-app-border bg-app-bg p-3',
  detailWrap:
    'overflow-x-auto rounded-[9px] border border-app-border bg-app-surface',
  detailTable:
    'w-full min-w-[720px] border-collapse text-[0.82rem] [&_th]:border-b [&_th]:border-app-border-soft [&_th]:px-2.5 [&_th]:py-[9px] [&_th]:text-left [&_th]:align-top [&_td]:border-b [&_td]:border-app-border-soft [&_td]:px-2.5 [&_td]:py-[9px] [&_td]:text-left [&_td]:align-top [&_thead_th]:bg-app-surface-muted [&_thead_th]:text-app-muted [&_th:last-child]:whitespace-nowrap [&_th:last-child]:text-right [&_td:last-child]:whitespace-nowrap [&_td:last-child]:text-right [&_tfoot_th]:border-b-0 [&_tfoot_th:first-child]:text-right',
  empty:
    'm-3 rounded-[10px] border border-dashed border-app-border bg-app-surface p-[18px] text-center text-app-muted',
} as const;

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const STATUS_LABELS: Record<LogisticsExpenseAdminStatus, string> = {
  1: 'Aguardando Aprovação',
  2: 'Aprovadas Aguardando Pagamento',
  4: 'Pagas',
};

interface DetailState {
  loading: boolean;
  data?: LogisticsExpenseAdminDetailsResponse;
  error?: string;
}

export interface ExpenseAdminDashboardInitialFilters {
  startDate?: string;
  endDate?: string;
  status?: LogisticsExpenseAdminStatus;
}

function errorMessage(reason: unknown, fallback: string): string {
  if (
    reason &&
    typeof reason === 'object' &&
    'body' in reason &&
    reason.body &&
    typeof reason.body === 'object' &&
    'message' in reason.body
  ) {
    const message = (reason.body as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }

  return fallback;
}

function formatDate(value: string): string {
  const date = value.slice(0, 10);
  const year = date.slice(0, 4);
  const month = date.slice(5, 7);
  const day = date.slice(8, 10);
  return `${day}/${month}/${year}`;
}

function detailId(group: LogisticsExpenseAdminGroup, key: string): string {
  return `${group}:${key}`;
}

function DetailTable({ state }: { state: DetailState | undefined }) {
  if (!state || state.loading) {
    return <div className={styles.detailFeedback}>Carregando detalhes…</div>;
  }

  if (state.error) {
    return <div className={styles.detailError}>{state.error}</div>;
  }

  if (!state.data || state.data.items.length === 0) {
    return <div className={styles.detailFeedback}>Nenhum registro encontrado.</div>;
  }

  return (
    <div className={styles.detailWrap}>
      <table className={styles.detailTable}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Data</th>
            <th>Colaborador</th>
            <th>Descrição</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {state.data.items.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{formatDate(item.createdAt)}</td>
              <td>{item.userName}</td>
              <td>{item.description || '—'}</td>
              <td>{currency.format(item.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={4}>Total</th>
            <th>{currency.format(state.data.total)}</th>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function BreakdownPanel({
  title,
  group,
  items,
  openDetail,
  detailStates,
  onToggle,
}: {
  title: string;
  group: LogisticsExpenseAdminGroup;
  items: LogisticsExpenseAdminBreakdownItem[];
  openDetail: string | null;
  detailStates: Record<string, DetailState>;
  onToggle: (group: LogisticsExpenseAdminGroup, key: string) => void;
}) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <section className={styles.breakdownPanel}>
      <header>
        <div>
          <span>Resumo</span>
          <h2>{title}</h2>
        </div>
        <strong>{currency.format(total)}</strong>
      </header>

      <div className={styles.breakdownRows}>
        {items.length === 0 ? (
          <div className={styles.empty}>Nenhum dado no período.</div>
        ) : (
          items.map((item) => {
            const id = detailId(group, item.key);
            const expanded = openDetail === id;

            return (
              <div className={styles.breakdownEntry} key={id}>
                <button
                  aria-expanded={expanded}
                  className={styles.breakdownButton}
                  onClick={() => onToggle(group, item.key)}
                  type="button"
                >
                  <span className={styles.expandIcon}>{expanded ? '−' : '+'}</span>
                  <span className={styles.breakdownLabel}>{item.label}</span>
                  <strong>{currency.format(item.amount)}</strong>
                </button>
                {expanded ? (
                  <div className={styles.detailArea}>
                    <DetailTable state={detailStates[id]} />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export function ExpenseAdminDashboardScreen({
  currentUser,
  initialFilters,
}: {
  currentUser: CurrentUserResponse;
  initialFilters?: ExpenseAdminDashboardInitialFilters;
}) {
  const [summary, setSummary] =
    useState<LogisticsExpenseAdminDashboardResponse | null>(null);
  const [startDate, setStartDate] = useState(initialFilters?.startDate ?? '');
  const [endDate, setEndDate] = useState(initialFilters?.endDate ?? '');
  const [status, setStatus] = useState<LogisticsExpenseAdminStatus>(
    initialFilters?.status ?? 4,
  );
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [detailStates, setDetailStates] = useState<Record<string, DetailState>>(
    {},
  );

  const canApprove = currentUser.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.LogisticsExpensesApprove,
  );

  const canPay = currentUser.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.LogisticsExpensesPay,
  );

  const loadSummary = useCallback(
    async (
      nextStart?: string,
      nextEnd?: string,
      nextStatus: LogisticsExpenseAdminStatus = 4,
    ) => {
      try {
        setLoading(true);
        setFeedback('');
        setOpenDetail(null);
        setDetailStates({});

        const response = await getExpenseAdminDashboard(
          nextStart,
          nextEnd,
          nextStatus,
        );
        setSummary(response);
        setStartDate(response.period.startDate);
        setEndDate(response.period.endDate);
        setStatus(response.period.status);
      } catch (reason) {
        setFeedback(
          errorMessage(reason, 'Não foi possível carregar a gestão de RDs.'),
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadSummary(
      initialFilters?.startDate,
      initialFilters?.endDate,
      initialFilters?.status ?? 4,
    );
  }, [
    initialFilters?.endDate,
    initialFilters?.startDate,
    initialFilters?.status,
    loadSummary,
  ]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadSummary(startDate, endDate, status);
  }

  function selectStatus(nextStatus: LogisticsExpenseAdminStatus) {
    if (loading) return;
    void loadSummary(startDate || undefined, endDate || undefined, nextStatus);
  }

  async function toggleDetail(
    group: LogisticsExpenseAdminGroup,
    key: string,
  ) {
    if (!summary) return;

    const id = detailId(group, key);
    if (openDetail === id) {
      setOpenDetail(null);
      return;
    }

    setOpenDetail(id);
    if (detailStates[id]?.data || detailStates[id]?.loading) return;

    setDetailStates((current) => ({
      ...current,
      [id]: { loading: true },
    }));

    try {
      const response = await getExpenseAdminDetails({
        startDate: summary.period.startDate,
        endDate: summary.period.endDate,
        status: summary.period.status,
        group,
        key,
      });
      setDetailStates((current) => ({
        ...current,
        [id]: { loading: false, data: response },
      }));
    } catch (reason) {
      setDetailStates((current) => ({
        ...current,
        [id]: {
          loading: false,
          error: errorMessage(
            reason,
            'Não foi possível carregar os detalhes deste agrupamento.',
          ),
        },
      }));
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <AppSidebar />
          <Link className={styles.brand} href="/dashboard">
            <strong>Helpdesk</strong>
            <span>Logística · Gestão RDs</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Logística · Administrativo</span>
            <h1>Painel Financeiro de RDs</h1>
            <p>
              Resumo administrativo por categoria, cliente e colaborador.
            </p>
          </div>
          <Link className={styles.secondaryLink} href="/logistics/expenses">
            Minhas despesas
          </Link>
        </section>

        <section className={styles.notice}>
          <strong>Fluxo administrativo de RD totalmente nativo.</strong>
          <span>
            As entradas PHP antigas agora existem apenas como bridges ou
            tombstones de compatibilidade.
          </span>
        </section>

        <section className={styles.filters}>
          <form onSubmit={apply}>
            <label>
              De
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label>
              Até
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
            <button disabled={loading} type="submit">
              {loading ? 'Atualizando…' : 'Filtrar'}
            </button>
          </form>
          {summary ? (
            <small>
              Exibindo {STATUS_LABELS[summary.period.status].toLowerCase()} de{' '}
              {formatDate(summary.period.startDate)} até{' '}
              {formatDate(summary.period.endDate)}.
            </small>
          ) : null}
        </section>

        {feedback ? <div className={styles.feedback}>{feedback}</div> : null}
        {loading && !summary ? (
          <div className={styles.feedback}>Carregando painel financeiro…</div>
        ) : null}

        {summary ? (
          <>
            <section className={styles.metrics}>
              <article data-active={status === 1}>
                <span>Aguardando Aprovação</span>
                <strong>{currency.format(summary.totals.globalPending)}</strong>
                <small>
                  No período: {currency.format(summary.totals.periodPending)} ·{' '}
                  {summary.totals.periodPendingCount} lançamento(s)
                </small>
                <div className={styles.metricActions}>
                  <button
                    disabled={loading}
                    onClick={() => selectStatus(1)}
                    type="button"
                  >
                    Ver resumo
                  </button>
                  {canApprove ? (
                    <Link
                      className={styles.approvalLink}
                      href="/logistics/expenses/admin/approvals"
                    >
                      Aprovar despesas
                    </Link>
                  ) : null}
                </div>
              </article>

              <article data-active={status === 2}>
                <span>Aprovadas Aguardando Pagamento</span>
                <strong>{currency.format(summary.totals.globalApproved)}</strong>
                <small>
                  {summary.totals.globalApprovedCount} lançamento(s) no total ·{' '}
                  {currency.format(summary.totals.periodApproved)} no período
                </small>
                <div className={styles.metricActions}>
                  <button
                    disabled={loading}
                    onClick={() => selectStatus(2)}
                    type="button"
                  >
                    Ver resumo
                  </button>
                  {canPay ? (
                    <Link
                      className={styles.paymentLink}
                      href="/logistics/expenses/admin/payments"
                    >
                      Pagar despesas
                    </Link>
                  ) : null}
                </div>
              </article>

              <article data-active={status === 4}>
                <span>Pagas</span>
                <strong>{currency.format(summary.totals.periodPaid)}</strong>
                <small>Total pago no período selecionado</small>
                <div className={styles.metricActions}>
                  <button
                    disabled={loading}
                    onClick={() => selectStatus(4)}
                    type="button"
                  >
                    Ver resumo
                  </button>
                  <Link
                    className={styles.reportLink}
                    href="/logistics/expenses/admin/report"
                  >
                    Relatório de pagamentos
                  </Link>
                  <Link
                    className={styles.reportLink}
                    href="/logistics/expenses/admin/analysis"
                  >
                    Análise comparativa
                  </Link>
                </div>
              </article>
            </section>

            <section className={styles.summaryHeader}>
              <span className={styles.eyebrow}>Resumo selecionado</span>
              <h2>{STATUS_LABELS[summary.period.status]}</h2>
            </section>

            <div className={styles.breakdownGrid}>
              <BreakdownPanel
                detailStates={detailStates}
                group="category"
                items={summary.categories}
                onToggle={(group, key) => void toggleDetail(group, key)}
                openDetail={openDetail}
                title="Por Categoria"
              />
              <BreakdownPanel
                detailStates={detailStates}
                group="client"
                items={summary.clients}
                onToggle={(group, key) => void toggleDetail(group, key)}
                openDetail={openDetail}
                title="Por Cliente"
              />
              <BreakdownPanel
                detailStates={detailStates}
                group="collaborator"
                items={summary.collaborators}
                onToggle={(group, key) => void toggleDetail(group, key)}
                openDetail={openDetail}
                title="Por Colaborador"
              />
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

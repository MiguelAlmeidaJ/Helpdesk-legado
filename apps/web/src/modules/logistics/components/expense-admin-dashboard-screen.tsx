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
import styles from './expense-admin-dashboard-screen.module.css';

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
}: {
  currentUser: CurrentUserResponse;
}) {
  const [summary, setSummary] =
    useState<LogisticsExpenseAdminDashboardResponse | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<LogisticsExpenseAdminStatus>(4);
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
    void loadSummary();
  }, [loadSummary]);

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
          <strong>Aprovação e recusa já estão no fluxo nativo.</strong>
          <span>
            Pagamento, relatório e ajustes gerenciais continuam no legado até
            os próximos cortes da migração.
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
                <button
                  disabled={loading}
                  onClick={() => selectStatus(2)}
                  type="button"
                >
                  Ver resumo
                </button>
              </article>

              <article data-active={status === 4}>
                <span>Pagas</span>
                <strong>{currency.format(summary.totals.periodPaid)}</strong>
                <small>Total pago no período selecionado</small>
                <button
                  disabled={loading}
                  onClick={() => selectStatus(4)}
                  type="button"
                >
                  Ver resumo
                </button>
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

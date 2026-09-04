"use client";

import type {
  CurrentUserResponse,
  LogisticsExpenseDashboardResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { getExpenseDashboard } from '../api/expense-dashboard-api';
import styles from './expense-dashboard-screen.module.css';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
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
    const message = (reason.body as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }

  return 'Não foi possível carregar o painel de despesas.';
}

function formatDate(value: string): string {
  const year = value.slice(0, 4);
  const month = value.slice(5, 7);
  const day = value.slice(8, 10);
  return `${day}/${month}/${year}`;
}

export function ExpenseDashboardScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [data, setData] = useState<LogisticsExpenseDashboardResponse | null>(
    null,
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async (start?: string, end?: string) => {
    try {
      setLoading(true);
      setFeedback('');

      const response = await getExpenseDashboard(start, end);
      setData(response);
      setStartDate(response.period.startDate);
      setEndDate(response.period.endDate);
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(startDate, endDate);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <AppSidebar />
          <Link className={styles.brand} href="/dashboard">
            <strong>Helpdesk</strong>
            <span>Logística · RD</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Logística</span>
            <h1>Minhas Despesas</h1>
            <p>{data?.userName ?? 'Usuário autenticado'}</p>
          </div>
          <Link className={styles.readOnlyBadge} href="/logistics/expenses/manage">
            Gerenciar despesas
          </Link>
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
          <small>
            Cadastro e edição de despesas já estão disponíveis no fluxo nativo.
          </small>
        </section>

        {feedback ? <div className={styles.feedback}>{feedback}</div> : null}
        {loading && !data ? (
          <div className={styles.feedback}>Carregando despesas…</div>
        ) : null}

        {data ? (
          <>
            <section className={styles.metrics}>
              <article>
                <span>Aguardando Aprovação</span>
                <strong>{currency.format(data.totals.awaitingApproval)}</strong>
              </article>
              <article>
                <span>Aprovado (A Receber)</span>
                <strong>
                  {currency.format(data.totals.approvedForPayment)}
                </strong>
              </article>
              <article>
                <span>Recebido (no período)</span>
                <strong>{currency.format(data.totals.receivedInPeriod)}</strong>
              </article>
            </section>

            <section className={styles.panel}>
              <header>
                <div>
                  <span className={styles.eyebrow}>Últimos recebimentos</span>
                  <h2>{data.period.label}</h2>
                </div>
                <small>
                  Atualizado em {data.generatedAt.replace('T', ' ')}
                </small>
              </header>

              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Data</th>
                      <th>Categoria</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.latestReceived.length === 0 ? (
                      <tr>
                        <td className={styles.empty} colSpan={4}>
                          Nenhum dado no período.
                        </td>
                      </tr>
                    ) : (
                      data.latestReceived.map((item) => (
                        <tr key={item.id}>
                          <td>{item.clientName}</td>
                          <td>{formatDate(item.date)}</td>
                          <td>{item.categoryName}</td>
                          <td>{currency.format(item.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

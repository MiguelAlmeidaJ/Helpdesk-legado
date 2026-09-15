"use client";

import type {
  CurrentUserResponse,
  DashboardRanking,
  DashboardRankingEntry,
  OperationalDashboardResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/api-client';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { fetchOperationalDashboard } from '../api/dashboard-api';
import styles from './operational-dashboard-screen.module.css';

function dateFromYmd(value: string): Date {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  return new Date(Date.UTC(year, month - 1, day));
}

function ymd(value: Date): string {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, '0'),
    String(value.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function currentMonthRange(current: string): [string, string] {
  const date = dateFromYmd(current);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return [
    ymd(new Date(Date.UTC(year, month, 1))),
    ymd(new Date(Date.UTC(year, month + 1, 0))),
  ];
}

function currentWeekRange(current: string): [string, string] {
  const date = dateFromYmd(current);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setUTCDate(start.getUTCDate() + offset);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return [ymd(start), ymd(end)];
}

function RankingCard({
  ranking,
}: {
  ranking: DashboardRanking;
}) {
  const max = Math.max(0, ...ranking.entries.map((entry) => entry.total));

  return (
    <article className={styles.rankingCard} data-ranking={ranking.id}>
      <header>
        <div>
          <span>{ranking.id.toUpperCase()}</span>
          <h3>{ranking.label}</h3>
        </div>
        <strong>{ranking.total}</strong>
      </header>

      <div className={styles.rankingList}>
        {ranking.entries.length === 0 ? (
          <p className={styles.empty}>Nenhum dado no período.</p>
        ) : (
          ranking.entries.map((entry, index) => (
            <RankingRow
              entry={entry}
              index={index}
              key={`${entry.name}-${index}`}
              max={max}
            />
          ))
        )}
      </div>
    </article>
  );
}

function RankingRow({
  entry,
  index,
  max,
}: {
  entry: DashboardRankingEntry;
  index: number;
  max: number;
}) {
  const width = max > 0 ? Math.max(3, (entry.total / max) * 100) : 0;

  return (
    <div className={styles.rankingRow}>
      <div className={styles.rankingName}>
        <span>{index === 0 ? '♛' : index + 1}</span>
        <strong>{entry.name}</strong>
        <b>{entry.total}</b>
      </div>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${width}%` }} />
      </div>
      {entry.tickets !== undefined || entry.tasks !== undefined ? (
        <small>
          {entry.tickets ?? 0} atendimentos · {entry.tasks ?? 0} tarefas
        </small>
      ) : null}
    </div>
  );
}

function PodiumCard({ ranking }: { ranking: DashboardRanking }) {
  return (
    <article className={styles.podiumCard} data-ranking={ranking.id}>
      <header>
        <span>{ranking.id.toUpperCase()}</span>
        <h3>{ranking.label}</h3>
      </header>
      <ol>
        {ranking.entries.length === 0 ? (
          <li className={styles.empty}>Sem dados no trimestre.</li>
        ) : (
          ranking.entries.slice(0, 3).map((entry, index) => (
            <li key={`${entry.name}-${index}`}>
              <span>{index + 1}º</span>
              <strong>{entry.name}</strong>
              <b>{entry.total}</b>
            </li>
          ))
        )}
      </ol>
    </article>
  );
}

export function OperationalDashboardScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [data, setData] = useState<OperationalDashboardResponse | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (start?: string, end?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchOperationalDashboard(start, end);
      setData(response);
      setStartDate(response.period.startDate);
      setEndDate(response.period.endDate);
    } catch (reason: unknown) {
      setError(
        reason instanceof ApiError && reason.status === 401
          ? 'Sua sessão expirou. Entre novamente.'
          : 'Não foi possível carregar o dashboard operacional.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = useMemo(
    () => data?.generatedAt.slice(0, 10) ?? '',
    [data?.generatedAt],
  );

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(startDate, endDate);
  }

  function quickRange(kind: 'today' | 'week' | 'month' | 'quarter') {
    if (!data || !today) return;

    if (kind === 'today') {
      void load(today, today);
      return;
    }
    if (kind === 'quarter') {
      void load(data.quarter.startDate, data.quarter.endDate);
      return;
    }

    const [start, end] =
      kind === 'week' ? currentWeekRange(today) : currentMonthRange(today);
    void load(start, end);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <AppSidebar />
          <Link className={styles.brand} href="/dashboard">
            <strong>Helpdesk</strong>
            <span>Painel operacional</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Visão operacional</span>
            <h1>Dashboard</h1>
            <p>
              Rankings de produção por período e pódio do trimestre atual.
            </p>
          </div>
          <Link className={styles.ticketsLink} href="/tickets">
            Abrir Atendimentos
          </Link>
        </section>

        {error ? <div className={styles.error}>{error}</div> : null}
        {loading && !data ? (
          <div className={styles.notice}>Carregando dashboard…</div>
        ) : null}

        {data && !data.internalUser ? (
          <div className={styles.notice}>
            O ranking operacional é exibido somente para usuários internos.
          </div>
        ) : null}

        {data?.internalUser ? (
          <>
            <section className={styles.filters}>
              <form onSubmit={apply}>
                <label>
                  Início
                  <input
                    onChange={(event) => setStartDate(event.target.value)}
                    type="date"
                    value={startDate}
                  />
                </label>
                <label>
                  Fim
                  <input
                    onChange={(event) => setEndDate(event.target.value)}
                    type="date"
                    value={endDate}
                  />
                </label>
                <button disabled={loading} type="submit">
                  {loading ? 'Atualizando…' : 'Aplicar'}
                </button>
              </form>

              <div className={styles.quickRanges}>
                <button onClick={() => quickRange('today')} type="button">Hoje</button>
                <button onClick={() => quickRange('week')} type="button">Semana</button>
                <button onClick={() => quickRange('month')} type="button">Mês atual</button>
                <button onClick={() => quickRange('quarter')} type="button">Trimestre</button>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.eyebrow}>Ranking</span>
                  <h2>{data.period.label}</h2>
                </div>
                <small>Atualizado em {data.generatedAt.replace('T', ' ')}</small>
              </div>
              <div className={styles.rankingGrid}>
                {data.periodRankings.map((ranking) => (
                  <RankingCard key={ranking.id} ranking={ranking} />
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.eyebrow}>Pódio</span>
                  <h2>{data.quarter.label}</h2>
                </div>
              </div>
              <div className={styles.podiumGrid}>
                {data.quarterRankings.map((ranking) => (
                  <PodiumCard key={ranking.id} ranking={ranking} />
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

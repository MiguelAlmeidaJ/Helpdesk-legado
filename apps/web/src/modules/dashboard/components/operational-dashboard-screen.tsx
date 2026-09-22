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
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { fetchOperationalDashboard } from '../api/dashboard-api';

const EYEBROW_CLASS =
  'text-[9px] font-black uppercase tracking-[0.09em] text-app-muted';
const CONTROL_CLASS =
  'inline-flex min-h-9 items-center justify-center rounded-lg border border-app-border-strong bg-app-surface px-[13px] text-[10px] font-extrabold text-app-text-soft no-underline transition-colors hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
const INPUT_CLASS =
  'min-h-9 rounded-[7px] border border-app-border-strong bg-app-surface px-[9px] text-app-text outline-none transition focus:border-app-brand focus:ring-3 focus:ring-[var(--app-brand-ring)]';
const CARD_CLASS =
  'overflow-hidden rounded-[11px] border border-app-border bg-app-surface';
const CARD_HEADER_CLASS =
  'flex items-center justify-between gap-2.5 border-b border-app-border-soft bg-app-surface-muted px-3 py-[11px]';
const EMPTY_CLASS = 'm-0 px-0.5 py-3 text-[9px] text-app-subtle';

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

function rankingAccent(rankingId: string): string {
  switch (rankingId) {
    case 'devops':
      return 'text-amber-500';
    case 'mkt':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'qa':
      return 'text-violet-600 dark:text-violet-400';
    default:
      return 'text-blue-600 dark:text-blue-400';
  }
}

function rankingBarColor(rankingId: string): string {
  switch (rankingId) {
    case 'mkt':
      return 'bg-[#109618]';
    case 'qa':
      return 'bg-[#6f42c1]';
    default:
      return 'bg-[#007bff]';
  }
}

function rankingIcon(rankingId: string): string {
  switch (rankingId) {
    case 'devops':
      return '</>';
    case 'mkt':
      return '📣';
    case 'qa':
      return '●';
    default:
      return '▦';
  }
}

function podiumUnit(rankingId: string, total: number): string {
  if (rankingId === 'ti') return total === 1 ? 'atendimento' : 'atendimentos';
  if (rankingId === 'mkt') return total === 1 ? 'tarefa' : 'tarefas';
  return total === 1 ? 'chamado' : 'chamados';
}

function RankingCard({ ranking }: { ranking: DashboardRanking }) {
  const max = Math.max(0, ...ranking.entries.map((entry) => entry.total));

  return (
    <article
      className="overflow-hidden rounded-[5px] border border-app-border bg-app-surface shadow-sm"
      data-ranking={ranking.id}
    >
      <header className="flex min-h-[44px] items-center justify-between gap-3 border-b border-app-border bg-app-surface-muted px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`shrink-0 text-[15px] font-black ${rankingAccent(ranking.id)}`}
            aria-hidden="true"
          >
            {rankingIcon(ranking.id)}
          </span>
          <h3 className="m-0 truncate text-[14px] font-bold text-app-text">
            {ranking.label}
          </h3>
        </div>
        <strong className="whitespace-nowrap text-[13px] font-black text-app-text">
          Total: {ranking.total}
        </strong>
      </header>

      <div className="h-[375px] overflow-y-auto px-5 py-2">
        {ranking.entries.length === 0 ? (
          <p className="m-0 px-0.5 py-5 text-xs text-app-subtle">
            Nenhum dado no período.
          </p>
        ) : (
          ranking.entries.map((entry, index) => (
            <RankingRow
              entry={entry}
              index={index}
              key={`${entry.name}-${index}`}
              max={max}
              rankingId={ranking.id}
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
  rankingId,
}: {
  entry: DashboardRankingEntry;
  index: number;
  max: number;
  rankingId: string;
}) {
  const width = max > 0 ? Math.max(3, (entry.total / max) * 100) : 0;
  const tickets = entry.tickets ?? 0;
  const tasks = entry.tasks ?? 0;
  const ticketsWidth = max > 0 ? (tickets / max) * 100 : 0;
  const tasksWidth = max > 0 ? (tasks / max) * 100 : 0;

  return (
    <div className="border-b border-app-border-soft py-[11px] last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <strong className="min-w-0 truncate text-[14px] font-bold text-app-text">
          {index === 0 ? (
            <span className="mr-1.5 text-[20px] leading-none" aria-label="Primeiro colocado">
              👑
            </span>
          ) : null}
          {entry.name}
        </strong>
        <b className="shrink-0 text-[14px] font-black text-app-text">
          {entry.total}
        </b>
      </div>

      <div className="mt-1.5 h-[12px] overflow-hidden rounded-[4px] bg-app-border-soft">
        {rankingId === 'devops' ? (
          <div className="flex h-full w-full">
            {tickets > 0 ? (
              <div
                className="flex h-full items-center justify-center overflow-hidden bg-[#c23a1b] text-[8px] font-black text-white"
                style={{ width: `${ticketsWidth}%` }}
                title={`Atendimentos: ${tickets}`}
              >
                {ticketsWidth >= 12 ? tickets : null}
              </div>
            ) : null}
            {tasks > 0 ? (
              <div
                className="flex h-full items-center justify-center overflow-hidden bg-[#f5981e] text-[8px] font-black text-white"
                style={{ width: `${tasksWidth}%` }}
                title={`Tarefas: ${tasks}`}
              >
                {tasksWidth >= 12 ? tasks : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div
            className={`h-full rounded-[inherit] ${rankingBarColor(rankingId)}`}
            style={{ width: `${width}%` }}
          />
        )}
      </div>

      {rankingId === 'devops' ? (
        <div className="mt-1 flex items-center gap-3 text-[9px] font-semibold text-app-subtle">
          <span className="inline-flex items-center gap-1">
            <i className="h-2 w-2 rounded-sm bg-[#c23a1b]" />
            {tickets} atend.
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2 w-2 rounded-sm bg-[#f5981e]" />
            {tasks} tarefas
          </span>
        </div>
      ) : null}
    </div>
  );
}

function PodiumCard({
  ranking,
  quarterNumber,
  year,
}: {
  ranking: DashboardRanking;
  quarterNumber: number;
  year: number;
}) {
  const [first, second, third] = ranking.entries.slice(0, 3);

  return (
    <article
      className="overflow-hidden rounded-[5px] border border-app-border bg-app-surface shadow-sm"
      data-ranking={ranking.id}
    >
      <header className="flex min-h-[42px] items-center justify-between gap-3 border-b border-app-border px-4 py-2.5">
        <h3 className="m-0 flex items-center gap-2 text-[13px] font-black text-app-text">
          <span className="text-[15px]" aria-hidden="true">🏆</span>
          {ranking.label === 'QA - Abertura de Atd' ? 'QA' : ranking.label.toUpperCase()}
        </h3>
        <span className="text-[10px] font-semibold text-app-subtle">
          T{quarterNumber} {year}
        </span>
      </header>

      {first ? (
        <div className="px-4 py-3">
          <div className="flex min-h-[66px] items-center justify-center gap-3 border-b border-app-border-soft pb-3 text-center">
            <span className="text-[24px] leading-none" aria-label="Primeiro colocado">🥇</span>
            <div className="min-w-0 text-left">
              <strong className="block truncate text-[14px] font-black text-app-text">
                {first.name}
              </strong>
              <span className="mt-0.5 block text-[10px] text-app-muted">
                {first.total} {podiumUnit(ranking.id, first.total)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-app-border-soft pt-2">
            <PodiumRunner entry={second} rankingId={ranking.id} medal="🥈" />
            <PodiumRunner entry={third} rankingId={ranking.id} medal="🥉" />
          </div>
        </div>
      ) : (
        <p className="m-0 px-4 py-6 text-center text-xs text-app-subtle">
          Nenhum registro no trimestre.
        </p>
      )}
    </article>
  );
}

function PodiumRunner({
  entry,
  rankingId,
  medal,
}: {
  entry: DashboardRankingEntry | undefined;
  rankingId: string;
  medal: string;
}) {
  if (!entry) {
    return <div className="min-h-[58px] px-3 py-2" />;
  }

  return (
    <div className="flex min-h-[58px] items-start gap-2 px-3 py-2 first:pl-0 last:pr-0">
      <span className="mt-0.5 text-[16px] leading-none" aria-hidden="true">
        {medal}
      </span>
      <div className="min-w-0">
        <strong className="block text-[11px] font-black leading-snug text-app-text">
          {entry.name}
        </strong>
        <span className="mt-0.5 block text-[9px] text-app-muted">
          {entry.total} {podiumUnit(rankingId, entry.total)}
        </span>
      </div>
    </div>
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
          : 'Não foi possível carregar o painel operacional.',
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
    <main className="min-h-screen bg-app-bg text-app-text">
      <AppPageHeader
        actions={
          <Link className={CONTROL_CLASS} href="/atendimentos">
            Abrir atendimentos
          </Link>
        }
        subtitle="Rankings de produção por período e pódio do trimestre atual."
        title="Painel"
        user={currentUser}
      />

      <div className="mx-auto w-[min(1440px,calc(100%-32px))] pt-6 pb-12 max-[680px]:w-[calc(100%-20px)]">

        {error ? (
          <div
            className="mb-3.5 rounded-[9px] border border-app-danger-border bg-app-danger-soft px-3.5 py-3 text-[11px] text-app-danger"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        {loading && !data ? (
          <div
            className="mb-3.5 rounded-[9px] border border-app-border bg-app-surface px-3.5 py-3 text-[11px] text-app-muted"
            role="status"
          >
            Carregando painel…
          </div>
        ) : null}

        {data && !data.internalUser ? (
          <div className="mb-3.5 rounded-[9px] border border-app-border bg-app-surface px-3.5 py-3 text-[11px] text-app-muted">
            O ranking operacional é exibido somente para usuários internos.
          </div>
        ) : null}

        {data?.internalUser ? (
          <>
            <section className="mb-[18px] flex items-end justify-between gap-3.5 rounded-[11px] border border-app-border bg-app-surface px-3.5 py-3 max-[1100px]:flex-col max-[1100px]:items-stretch">
              <form
                className="flex items-end gap-2 max-[680px]:flex-wrap max-[680px]:items-stretch"
                onSubmit={apply}
              >
                <label className="grid gap-1 text-[9px] font-extrabold uppercase text-app-subtle max-[680px]:flex-[1_1_130px]">
                  Início
                  <input
                    className={INPUT_CLASS}
                    onChange={(event) => setStartDate(event.target.value)}
                    type="date"
                    value={startDate}
                  />
                </label>
                <label className="grid gap-1 text-[9px] font-extrabold uppercase text-app-subtle max-[680px]:flex-[1_1_130px]">
                  Fim
                  <input
                    className={INPUT_CLASS}
                    onChange={(event) => setEndDate(event.target.value)}
                    type="date"
                    value={endDate}
                  />
                </label>
                <button className={CONTROL_CLASS} disabled={loading} type="submit">
                  {loading ? 'Atualizando…' : 'Aplicar'}
                </button>
              </form>

              <div className="flex items-end gap-2 max-[680px]:flex-wrap max-[680px]:items-stretch">
                <button className={`${CONTROL_CLASS} min-h-8`} onClick={() => quickRange('today')} type="button">Hoje</button>
                <button className={`${CONTROL_CLASS} min-h-8`} onClick={() => quickRange('week')} type="button">Semana</button>
                <button className={`${CONTROL_CLASS} min-h-8`} onClick={() => quickRange('month')} type="button">Mês atual</button>
                <button className={`${CONTROL_CLASS} min-h-8`} onClick={() => quickRange('quarter')} type="button">Trimestre</button>
              </div>
            </section>

            <section className="mt-5">
              <div className="mb-2.5 flex items-center justify-between gap-4 max-[680px]:flex-col max-[680px]:items-stretch">
                <div>
                  <span className={EYEBROW_CLASS}>Ranking operacional</span>
                  <h2 className="mt-0.5 mb-0 text-[17px] font-bold text-app-text">
                    {data.period.label}
                  </h2>
                </div>
                <small className="text-[9px] text-app-subtle">
                  Atualizado em {data.generatedAt.replace('T', ' ')}
                </small>
              </div>
              <div className="grid grid-cols-4 gap-3 max-[1180px]:grid-cols-2 max-[680px]:grid-cols-1">
                {data.periodRankings.map((ranking) => (
                  <RankingCard key={ranking.id} ranking={ranking} />
                ))}
              </div>
            </section>

            <section className="mt-4">
              <div className="mb-2 rounded-[5px] border border-app-border bg-app-surface-muted px-3 py-2 shadow-sm">
                <h2 className="m-0 flex items-center gap-2 text-[13px] font-black text-app-text">
                  <span aria-hidden="true">🏆</span>
                  Ranking trimestral {data.quarter.label}
                </h2>
              </div>
              <div className="grid grid-cols-4 gap-3 max-[1180px]:grid-cols-2 max-[680px]:grid-cols-1">
                {data.quarterRankings.map((ranking) => (
                  <PodiumCard
                    key={ranking.id}
                    quarterNumber={data.quarter.number}
                    ranking={ranking}
                    year={Number(data.quarter.startDate.slice(0, 4))}
                  />
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

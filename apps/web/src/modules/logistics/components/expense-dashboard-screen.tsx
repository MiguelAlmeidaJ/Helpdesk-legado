"use client";

import type {
  CurrentUserResponse,
  LogisticsExpenseDashboardResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { DateRangePicker } from '../../../shared/ui/date-range-picker';
import { getExpenseDashboard } from '../api/expense-dashboard-api';
const styles = {
  page: 'min-h-screen bg-app-bg text-app-text',
  header:
    'sticky top-0 z-20 flex min-h-[58px] items-center justify-between gap-[18px] border-b border-app-border bg-[var(--app-header-bg)] px-6 backdrop-blur-xl max-[720px]:px-3',
  headerLeft: 'flex items-center gap-3',
  brand:
    'grid text-inherit no-underline [&_strong]:text-[15px] [&_span]:text-[10px] [&_span]:text-app-subtle',
  content: 'mx-auto w-[min(1200px,calc(100%-28px))] py-[22px] pb-12',
  hero:
    'flex items-end justify-between gap-[18px] rounded-[11px] border border-app-border bg-app-surface px-5 py-[18px] max-[720px]:flex-col max-[720px]:items-stretch [&_h1]:my-0.5 [&_h1]:text-[26px] [&_p]:m-0 [&_p]:text-[11px] [&_p]:text-app-muted',
  eyebrow:
    'text-[8px] font-black uppercase tracking-[0.08em] text-app-muted',
  readOnlyBadge:
    'rounded-full bg-app-brand-soft px-2 py-[5px] text-[9px] font-extrabold text-app-brand no-underline transition hover:bg-app-surface-hover',
  filters:
    'mt-2.5 flex items-end justify-between gap-[18px] rounded-[11px] border border-app-border bg-app-surface px-[13px] py-[11px] max-[720px]:flex-col max-[720px]:items-stretch [&_form]:flex [&_form]:items-end [&_form]:gap-2 max-[720px]:[&_form]:flex-wrap max-[720px]:[&_form]:items-stretch [&_label]:grid [&_label]:gap-1 [&_label]:text-[9px] [&_label]:font-extrabold [&_label]:uppercase [&_label]:text-app-muted [&_input]:min-h-[34px] [&_input]:rounded-[7px] [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-2 [&_input]:text-app-text [&_input]:outline-none [&_input:focus]:border-app-brand [&_input:focus]:ring-[3px] [&_input:focus]:ring-[var(--app-brand-ring)] [&_button]:min-h-[34px] [&_button]:cursor-pointer [&_button]:rounded-[7px] [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-3 [&_button]:text-app-text [&_button]:transition [&_button:hover]:bg-app-surface-hover [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-[0.6] [&_small]:max-w-[360px] [&_small]:text-right [&_small]:text-[9px] [&_small]:leading-[1.45] [&_small]:text-app-subtle max-[720px]:[&_small]:text-left',
  feedback:
    'mt-2.5 rounded-lg border border-app-border bg-app-surface px-3 py-2.5 text-[10px] text-app-text-soft',
  metrics:
    'mt-3.5 grid grid-cols-3 gap-4 max-[720px]:grid-cols-1 [&_article]:grid [&_article]:min-h-[145px] [&_article]:gap-[5px] [&_article]:rounded-xl [&_article]:border [&_article]:border-app-border [&_article]:border-t-4 [&_article:nth-child(1)]:border-t-amber-500 [&_article:nth-child(2)]:border-t-sky-500 [&_article:nth-child(3)]:border-t-emerald-600 [&_article]:bg-app-surface [&_article]:px-4 [&_article]:py-[18px] [&_article]:shadow-sm [&_span]:text-xs [&_span]:font-extrabold [&_span]:uppercase [&_span]:text-app-muted [&_strong]:self-end [&_strong]:text-[clamp(1.45rem,2.5vw,1.95rem)]',
  panel:
    'mt-4 overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm [&>header]:flex [&>header]:items-end [&>header]:justify-between [&>header]:gap-3.5 [&>header]:border-b [&>header]:border-app-border-soft [&>header]:bg-app-surface-muted [&>header]:px-3.5 [&>header]:py-3 max-[720px]:[&>header]:flex-col max-[720px]:[&>header]:items-stretch [&_h2]:mt-0.5 [&_h2]:mb-0 [&_h2]:text-[15px] [&_header_small]:text-[9px] [&_header_small]:text-app-subtle',
  tableWrap:
    'overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border-b [&_th]:border-app-border-soft [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_td]:border-b [&_td]:border-app-border-soft [&_td]:px-3 [&_td]:py-2.5 [&_td]:text-left [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-[0.04em] [&_th]:text-app-muted [&_th:last-child]:text-right [&_td:last-child]:text-right',
  empty: 'py-8! text-center! text-app-muted',
} as const;

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
  const [filterOpen, setFilterOpen] = useState(false);
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
    if (startDate && endDate && startDate > endDate) {
      setFeedback('A data inicial não pode ser posterior à data final.');
      return;
    }
    setFilterOpen(false);
    void load(startDate || undefined, endDate || undefined);
  }

  return (
    <main className={styles.page}>
      <AppPageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                aria-expanded={filterOpen}
                aria-haspopup="dialog"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-app-border-strong bg-app-surface px-3.5 text-sm font-semibold text-app-text transition hover:bg-app-surface-hover"
                onClick={() => setFilterOpen((current) => !current)}
                type="button"
              >
                <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
                Filtrar período
              </button>
              {filterOpen ? (
                <div role="dialog" aria-label="Filtrar período" className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(370px,calc(100vw-32px))] rounded-xl border border-app-border bg-app-surface p-4 shadow-2xl">
                  <form className="grid gap-3" onSubmit={apply}>
                    <strong className="text-sm">Selecionar intervalo</strong>
                    <DateRangePicker
                      disabled={loading}
                      startDate={startDate}
                      endDate={endDate}
                      onChange={(range) => { setStartDate(range.startDate); setEndDate(range.endDate); }}
                    />
                    {startDate && endDate && startDate > endDate ? (
                      <p className="m-0 text-xs text-app-danger">A data inicial deve ser anterior à final.</p>
                    ) : null}
                    <div className="flex justify-end gap-2">
                      <button className="min-h-9 rounded-lg border border-app-border-strong px-3 text-sm font-medium" type="button" onClick={() => { setStartDate(''); setEndDate(''); }}>Limpar</button>
                      <button className="min-h-9 rounded-lg bg-app-brand px-4 text-sm font-bold text-white" type="submit" disabled={loading || (Boolean(startDate && endDate) && startDate > endDate)}>Aplicar</button>
                    </div>
                  </form>
                </div>
              ) : null}
            </div>
            <Link className="inline-flex min-h-10 items-center rounded-lg border border-app-border-strong bg-app-surface px-3.5 text-sm font-semibold text-app-text no-underline hover:bg-app-surface-hover" href="/logistica/despesas/gerenciar">Gerenciar despesas</Link>
            <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-brand px-3.5 text-sm font-bold !text-white no-underline hover:opacity-90" href="/logistica/despesas/gerenciar?novo=1"><span aria-hidden="true">+</span> Nova despesa</Link>
          </div>
        }
        subtitle={data?.userName ?? 'Usuário autenticado'}
        title="Minhas Despesas"
        user={currentUser}
      />

      <div className={styles.content}>
        {data ? (
          <p className="mb-4 text-sm text-app-muted">
            Exibindo despesas de <strong className="text-app-text">{formatDate(data.period.startDate)}</strong> até <strong className="text-app-text">{formatDate(data.period.endDate)}</strong>.
          </p>
        ) : null}

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

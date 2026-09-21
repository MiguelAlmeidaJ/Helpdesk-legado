"use client";

import type {
  CurrentUserResponse,
  LogisticsExpenseApprovalItem,
  LogisticsExpenseApprovalQueueResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import {
  approveExpense,
  approveExpensesBatch,
  getExpenseApprovalQueue,
  rejectExpense,
} from '../api/expense-approval-api';
const styles = {
  page:
    'min-h-screen bg-app-bg text-app-text',
  header:
    'sticky top-0 z-20 flex min-h-[68px] items-center justify-between border-b border-app-border bg-[var(--app-header-bg)] px-8 backdrop-blur-xl max-[900px]:px-[18px]',
  headerLeft:
    'flex items-center gap-4',
  brand:
    'flex flex-col gap-0.5 text-inherit no-underline max-[560px]:[&_span]:hidden [&_span]:text-[0.78rem] [&_span]:uppercase [&_span]:tracking-[0.06em] [&_span]:text-app-muted',
  content:
    'mx-auto w-[min(1600px,calc(100%-36px))] py-[30px] pb-14 max-[900px]:w-[min(1600px,calc(100%-22px))]',
  hero:
    'mb-5 flex items-center justify-between gap-5 max-[900px]:flex-col max-[900px]:items-start [&_h1]:my-[5px] [&_h1]:text-[clamp(1.8rem,4vw,2.6rem)] [&_h1]:tracking-[-0.04em] [&_p]:m-0 [&_p]:text-app-muted',
  eyebrow:
    'text-[0.78rem] uppercase tracking-[0.06em] text-app-muted',
  secondaryLink:
    'rounded-[9px] border border-app-border-strong bg-app-surface px-3.5 py-2.5 font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover',
  error:
    'mb-4 rounded-[10px] border border-app-danger-border bg-app-danger-soft px-4 py-3.5 text-app-danger',
  success:
    'mb-4 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-200',
  empty:
    'mb-4 rounded-[10px] border border-dashed border-app-border-strong bg-app-surface px-4 py-3.5 text-center text-app-muted',
  summary:
    'mb-[18px] grid grid-cols-[repeat(3,minmax(0,1fr))_auto] gap-3.5 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1 [&>article]:flex [&>article]:flex-col [&>article]:gap-[5px] [&>article]:rounded-xl [&>article]:border [&>article]:border-app-border [&>article]:bg-app-surface [&>article]:px-[17px] [&>article]:py-[15px] [&_span]:text-[0.78rem] [&_span]:uppercase [&_span]:tracking-[0.06em] [&_span]:text-app-muted [&_strong]:text-[1.45rem] [&_small]:text-app-muted [&>button]:cursor-pointer [&>button]:rounded-[10px] [&>button]:border [&>button]:border-emerald-700 [&>button]:bg-emerald-700 [&>button]:px-[18px] [&>button]:font-extrabold [&>button]:text-white max-[900px]:[&>button]:min-h-[54px] [&>button:disabled]:cursor-wait [&>button:disabled]:opacity-[0.55] dark:[&>button]:border-emerald-600 dark:[&>button]:bg-emerald-700',
  panel:
    'overflow-hidden rounded-[14px] border border-app-border bg-app-surface shadow-sm [&>header]:flex [&>header]:items-center [&>header]:justify-between [&>header]:gap-4 [&>header]:border-b [&>header]:border-app-border-soft [&>header]:px-[18px] [&>header]:py-4 [&>header_h2]:mt-[3px] [&>header_h2]:mb-0 [&>header_h2]:text-[1.1rem] [&>header_button]:min-h-[38px] [&>header_button]:cursor-pointer [&>header_button]:rounded-[10px] [&>header_button]:border [&>header_button]:border-app-border-strong [&>header_button]:bg-app-surface [&>header_button]:px-[18px] [&>header_button]:font-extrabold [&>header_button]:text-app-text-soft [&>header_button]:transition [&>header_button:hover]:bg-app-surface-hover [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-[0.55]',
  tableWrap:
    'overflow-auto [&_table]:w-full [&_table]:min-w-[1320px] [&_table]:border-collapse [&_table]:text-[0.84rem] [&_th]:border-b [&_th]:border-app-border-soft [&_th]:px-2.5 [&_th]:py-[11px] [&_th]:text-left [&_th]:align-top [&_td]:border-b [&_td]:border-app-border-soft [&_td]:px-2.5 [&_td]:py-[11px] [&_td]:text-left [&_td]:align-top [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-[2] [&_thead_th]:bg-app-surface-muted [&_thead_th]:text-app-text-soft [&_tbody_tr:hover]:bg-app-surface-hover [&_td_small]:mt-1 [&_td_small]:block [&_td_small]:text-app-muted [&_td_p]:mb-[7px] [&_td_p]:mt-0 [&_td_p]:max-w-[300px] [&_td_p]:whitespace-pre-wrap [&_td_p]:[overflow-wrap:anywhere]',
  money:
    'whitespace-nowrap font-extrabold',
  attachments:
    'grid max-w-[180px] gap-[5px] [&_a]:text-app-brand [&_a]:[overflow-wrap:anywhere]',
  missingReceipt:
    'inline-block rounded-md border border-red-300 bg-red-50 px-[7px] py-[5px] text-[0.75rem] font-extrabold text-red-800 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-200',
  muted:
    'text-app-subtle',
  decision:
    'min-w-[275px] [&_textarea]:min-h-[72px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-app-border-strong [&_textarea]:bg-app-surface [&_textarea]:px-[9px] [&_textarea]:py-2 [&_textarea]:text-app-text [&_textarea]:outline-none [&_textarea:focus]:border-app-brand [&_textarea:focus]:ring-[3px] [&_textarea:focus]:ring-[var(--app-brand-ring)] [&>div]:mt-[7px] [&>div]:grid [&>div]:grid-cols-2 [&>div]:gap-[7px] [&_button]:min-h-9 [&_button]:cursor-pointer [&_button]:rounded-[7px] [&_button]:font-extrabold',
  approve:
    'border border-emerald-700 bg-emerald-700 text-white transition hover:bg-emerald-800 dark:border-emerald-600 dark:bg-emerald-700 dark:hover:bg-emerald-600',
  reject:
    'border border-red-700 bg-red-700 text-white transition hover:bg-red-800 dark:border-red-600 dark:bg-red-700 dark:hover:bg-red-600',
  batchNote:
    'mx-1 mt-2.5 text-[0.8rem] text-app-subtle',
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
    const value = (reason.body as { message?: unknown }).message;
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(' ');
  }
  return 'Não foi possível concluir a operação.';
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return value.replace('T', ' ');
}

function attachmentHref(item: LogisticsExpenseApprovalItem, key: string): string {
  return `/logistica/despesas/administracao/aprovacoes/anexos/${item.id}/${encodeURIComponent(key)}`;
}

export function ExpenseApprovalScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [queue, setQueue] = useState<LogisticsExpenseApprovalQueueResponse | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setFeedback('');
      const response = await getExpenseApprovalQueue();
      setQueue(response);
      setSelected(new Set());
      setRemarks({});
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedAmount = useMemo(() => {
    if (!queue) return 0;
    return queue.items
      .filter((item) => selected.has(item.id))
      .reduce((sum, item) => sum + item.amount, 0);
  }, [queue, selected]);

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < 100) next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!queue) return;
    setSelected((current) => {
      const limit = Math.min(queue.items.length, 100);
      if (current.size === limit) return new Set();
      return new Set(queue.items.slice(0, 100).map((item) => item.id));
    });
  }

  async function mutate(action: () => Promise<unknown>, message: string) {
    try {
      setBusy(true);
      setFeedback('');
      setSuccess('');
      await action();
      setSuccess(message);
      await load();
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  function approve(item: LogisticsExpenseApprovalItem) {
    if (!window.confirm(`Aprovar a RD #${item.id}?`)) return;
    void mutate(
      () => approveExpense(item.id, remarks[item.id] ?? ''),
      `RD #${item.id} aprovada.`,
    );
  }

  function reject(item: LogisticsExpenseApprovalItem) {
    if (!window.confirm(`Recusar a RD #${item.id}? Esta ação altera o status para recusada.`)) return;
    void mutate(() => rejectExpense(item.id), `RD #${item.id} recusada.`);
  }

  function approveSelected() {
    if (!queue || selected.size === 0) return;
    if (!window.confirm(`Aprovar ${selected.size} RD(s) selecionada(s)?`)) return;
    const items = queue.items
      .filter((item) => selected.has(item.id))
      .map((item) => ({ id: item.id, remarks: remarks[item.id] ?? '' }));
    void mutate(
      () => approveExpensesBatch(items),
      `${items.length} RD(s) aprovada(s) em lote.`,
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <AppSidebar />
          <Link className={styles.brand} href="/painel">
            <strong>Helpdesk</strong>
            <span>Logística · Aprovação RDs</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Workflow financeiro</span>
            <h1>Aprovação de Despesas</h1>
            <p>Aprove ou recuse somente RDs que ainda estão aguardando aprovação.</p>
          </div>
          <Link className={styles.secondaryLink} href="/logistica/despesas/administracao">
            Voltar à Gestão RDs
          </Link>
        </section>

        {feedback ? <div className={styles.error}>{feedback}</div> : null}
        {success ? <div className={styles.success}>{success}</div> : null}

        <section className={styles.summary}>
          <article>
            <span>Pendentes</span>
            <strong>{queue?.count ?? '—'}</strong>
          </article>
          <article>
            <span>Total pendente</span>
            <strong>{queue ? currency.format(queue.totalAmount) : '—'}</strong>
          </article>
          <article>
            <span>Selecionadas</span>
            <strong>{selected.size}</strong>
            <small>{currency.format(selectedAmount)}</small>
          </article>
          <button
            disabled={busy || loading || selected.size === 0}
            onClick={approveSelected}
            type="button"
          >
            {busy ? 'Processando…' : `Aprovar selecionadas (${selected.size})`}
          </button>
        </section>

        <section className={styles.panel}>
          <header>
            <div>
              <span className={styles.eyebrow}>Fila administrativa</span>
              <h2>RDs aguardando aprovação</h2>
            </div>
            <button disabled={busy || loading} onClick={() => void load()} type="button">
              Atualizar
            </button>
          </header>

          {loading && !queue ? (
            <div className={styles.empty}>Carregando despesas…</div>
          ) : queue && queue.items.length === 0 ? (
            <div className={styles.empty}>Nenhuma despesa pendente.</div>
          ) : queue ? (
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        aria-label="Selecionar despesas"
                        checked={selected.size > 0 && selected.size === Math.min(queue.items.length, 100)}
                        onChange={toggleAll}
                        type="checkbox"
                      />
                    </th>
                    <th>ID / Data</th>
                    <th>Categoria / Cliente</th>
                    <th>Colaborador</th>
                    <th>Valor</th>
                    <th>Comprovantes</th>
                    <th>Descrição / PIX</th>
                    <th>Decisão</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          aria-label={`Selecionar RD ${item.id}`}
                          checked={selected.has(item.id)}
                          disabled={busy || (!selected.has(item.id) && selected.size >= 100)}
                          onChange={() => toggle(item.id)}
                          type="checkbox"
                        />
                      </td>
                      <td>
                        <strong>#{item.id}</strong>
                        <small>{formatDate(item.createdAt)}</small>
                      </td>
                      <td>
                        <strong>{item.categoryName}</strong>
                        <small>{item.clientName}</small>
                      </td>
                      <td>{item.userName}</td>
                      <td className={styles.money}>{currency.format(item.amount)}</td>
                      <td>
                        {item.attachments.length > 0 ? (
                          <div className={styles.attachments}>
                            {item.attachments.map((attachment) => (
                              <a
                                href={attachmentHref(item, attachment.key)}
                                key={attachment.key}
                                rel="noreferrer"
                                target="_blank"
                              >
                                {attachment.name}
                              </a>
                            ))}
                          </div>
                        ) : item.receiptRequiredMissing ? (
                          <span className={styles.missingReceipt}>NOTA PENDENTE</span>
                        ) : (
                          <span className={styles.muted}>N/A</span>
                        )}
                      </td>
                      <td>
                        <p>{item.remarks || '—'}</p>
                        <small>PIX: {item.pix || 'não informado'}</small>
                        <small>Tipo: {item.pixTypeName || 'não informado'}</small>
                      </td>
                      <td className={styles.decision}>
                        <textarea
                          disabled={busy}
                          maxLength={255}
                          onChange={(event) =>
                            setRemarks((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder="Observações de aprovação"
                          value={remarks[item.id] ?? ''}
                        />
                        <div>
                          <button
                            className={styles.approve}
                            disabled={busy}
                            onClick={() => approve(item)}
                            type="button"
                          >
                            Aprovar
                          </button>
                          <button
                            className={styles.reject}
                            disabled={busy}
                            onClick={() => reject(item)}
                            type="button"
                          >
                            Recusar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
        <p className={styles.batchNote}>A aprovação em lote aceita até 100 RDs por operação e é atômica.</p>
      </div>
    </main>
  );
}

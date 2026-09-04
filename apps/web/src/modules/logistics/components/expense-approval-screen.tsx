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
import styles from './expense-approval-screen.module.css';

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
  return `/logistics/expenses/admin/approvals/attachments/${item.id}/${encodeURIComponent(key)}`;
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
          <Link className={styles.brand} href="/dashboard">
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
          <Link className={styles.secondaryLink} href="/logistics/expenses/admin">
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

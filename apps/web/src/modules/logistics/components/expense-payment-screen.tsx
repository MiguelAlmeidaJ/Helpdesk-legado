"use client";

import type {
  CurrentUserResponse,
  LogisticsExpensePaymentGroup,
  LogisticsExpensePaymentItem,
  LogisticsExpensePaymentQueueResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import {
  getExpensePaymentQueue,
  payExpense,
  payExpensesBatch,
  rejectExpensePayment,
} from '../api/expense-payment-api';
import {
  buildPixPayload,
  createPixTransactionId,
} from '../lib/pix-br-code';
import styles from './expense-payment-screen.module.css';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const PAGE_SIZE = 8;
const BATCH_LIMIT = 100;

type QrFactory = (
  typeNumber: 0,
  level: 'M',
) => {
  addData(data: string): void;
  make(): void;
  createDataURL(cellSize?: number, margin?: number): string;
};

interface PixDialogState {
  group: LogisticsExpensePaymentGroup;
  payload: string;
  dataUrl: string;
}

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
  if (reason instanceof Error && reason.message) return reason.message;
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

async function qrDataUrl(payload: string): Promise<string> {
  const module = await import('qrcode-generator');
  const candidate = module as unknown as {
    qrcode?: QrFactory;
    default?: QrFactory;
  };
  const factory = candidate.qrcode ?? candidate.default;
  if (!factory) throw new Error('Gerador de QR Code indisponível.');

  const qr = factory(0, 'M');
  qr.addData(payload);
  qr.make();
  return qr.createDataURL(7, 28);
}

function groupIds(group: LogisticsExpensePaymentGroup): number[] {
  return group.items.map((item) => item.id);
}

export function ExpensePaymentScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [queue, setQueue] = useState<LogisticsExpensePaymentQueueResponse | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [qrBusy, setQrBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [pixDialog, setPixDialog] = useState<PixDialogState | null>(null);

  const allItems = useMemo(
    () => queue?.groups.flatMap((group) => group.items) ?? [],
    [queue],
  );
  const selectedAmount = useMemo(
    () =>
      allItems
        .filter((item) => selected.has(item.id))
        .reduce((sum, item) => sum + item.amount, 0),
    [allItems, selected],
  );
  const totalPages = Math.max(1, Math.ceil((queue?.groups.length ?? 0) / PAGE_SIZE));
  const visibleGroups = useMemo(
    () => queue?.groups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) ?? [],
    [page, queue],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setFeedback('');
      const response = await getExpensePaymentQueue();
      setQueue(response);
      setSelected(new Set());
      setRemarks({});
      setExpanded(new Set());
      setPage(1);
      setPixDialog(null);
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleItem(id: number) {
    if (!selected.has(id) && selected.size >= BATCH_LIMIT) {
      setFeedback(`Selecione no máximo ${BATCH_LIMIT} RDs por operação.`);
      return;
    }
    setFeedback('');
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(group: LogisticsExpensePaymentGroup) {
    const ids = groupIds(group);
    const fullySelected = ids.every((id) => selected.has(id));
    const missing = ids.filter((id) => !selected.has(id));

    if (!fullySelected && selected.size + missing.length > BATCH_LIMIT) {
      setFeedback(
        `Este grupo excede o limite de ${BATCH_LIMIT} RDs por operação. Selecione os itens manualmente.`,
      );
      return;
    }

    setFeedback('');
    setSelected((current) => {
      const next = new Set(current);
      if (fullySelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function selectFirstBatch() {
    if (!queue) return;
    const ids = allItems.slice(0, BATCH_LIMIT).map((item) => item.id);
    if (selected.size === ids.length && ids.every((id) => selected.has(id))) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(ids));
    setFeedback(
      allItems.length > BATCH_LIMIT
        ? `A seleção foi limitada às primeiras ${BATCH_LIMIT} RDs.`
        : '',
    );
  }

  function toggleDetails(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
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

  function pay(item: LogisticsExpensePaymentItem) {
    if (!window.confirm(`Registrar a RD #${item.id} como paga?`)) return;
    void mutate(
      () => payExpense(item.id, remarks[item.id] ?? ''),
      `Pagamento da RD #${item.id} registrado.`,
    );
  }

  function reject(item: LogisticsExpensePaymentItem) {
    if (
      !window.confirm(
        `Recusar o pagamento da RD #${item.id}? Ela será movida para o status rejeitado.`,
      )
    ) {
      return;
    }
    void mutate(
      () => rejectExpensePayment(item.id, remarks[item.id] ?? ''),
      `Pagamento da RD #${item.id} recusado.`,
    );
  }

  function paySelected() {
    if (selected.size === 0) return;
    if (!window.confirm(`Registrar ${selected.size} RD(s) selecionada(s) como paga(s)?`)) {
      return;
    }
    const items = allItems
      .filter((item) => selected.has(item.id))
      .map((item) => ({ id: item.id, remarks: remarks[item.id] ?? '' }));
    void mutate(
      () => payExpensesBatch(items),
      `${items.length} RD(s) compensada(s) como paga(s).`,
    );
  }

  async function openPix(group: LogisticsExpensePaymentGroup) {
    if (!group.pix.trim()) {
      setFeedback('Este grupo não possui chave PIX informada.');
      return;
    }
    if (group.itemCount > BATCH_LIMIT) {
      setFeedback(
        `O grupo possui mais de ${BATCH_LIMIT} RDs e não pode ser compensado atomicamente por esta tela.`,
      );
      return;
    }

    try {
      setQrBusy(true);
      setFeedback('');
      const payload = buildPixPayload({
        pixKey: group.pix,
        amount: group.totalAmount,
        beneficiaryName: group.userName,
        transactionId: createPixTransactionId(group.userId),
      });
      setPixDialog({
        group,
        payload,
        dataUrl: await qrDataUrl(payload),
      });
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setQrBusy(false);
    }
  }

  async function copyPixPayload() {
    if (!pixDialog) return;
    try {
      await navigator.clipboard.writeText(pixDialog.payload);
      setSuccess('Código PIX copia e cola copiado.');
    } catch {
      setFeedback('Não foi possível copiar automaticamente o código PIX.');
    }
  }

  function compensatePixGroup() {
    if (!pixDialog) return;
    const { group } = pixDialog;
    if (
      !window.confirm(
        `Confirma que o PIX de ${currency.format(group.totalAmount)} foi efetuado no banco e deseja compensar ${group.itemCount} RD(s) como paga(s)?`,
      )
    ) {
      return;
    }
    const items = group.items.map((item) => ({
      id: item.id,
      remarks: remarks[item.id] ?? '',
    }));
    void mutate(
      () => payExpensesBatch(items),
      `${items.length} RD(s) do grupo PIX compensada(s) como paga(s).`,
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <AppSidebar />
          <Link className={styles.brand} href="/dashboard">
            <strong>Helpdesk</strong>
            <span>Logística · Pagamento RDs</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Workflow financeiro</span>
            <h1>Pagamento de Despesas</h1>
            <p>Compense somente RDs já aprovadas e ainda aguardando pagamento.</p>
          </div>
          <Link className={styles.secondaryLink} href="/logistics/expenses/admin">
            Voltar à Gestão RDs
          </Link>
        </section>

        <section className={styles.notice}>
          O QR Code é gerado localmente no navegador. O pagamento continua sendo
          realizado no aplicativo bancário; “compensar como pago” apenas registra a
          transição da RD no Helpdesk.
        </section>

        {feedback ? <div className={styles.error}>{feedback}</div> : null}
        {success ? <div className={styles.success}>{success}</div> : null}

        <section className={styles.summary}>
          <article>
            <span>Aguardando pagamento</span>
            <strong>{queue?.count ?? '—'}</strong>
          </article>
          <article>
            <span>Total aprovado</span>
            <strong>{queue ? currency.format(queue.totalAmount) : '—'}</strong>
          </article>
          <article>
            <span>Selecionadas</span>
            <strong>{selected.size}</strong>
            <small>{currency.format(selectedAmount)}</small>
          </article>
          <button
            disabled={busy || loading || selected.size === 0}
            onClick={paySelected}
            type="button"
          >
            {busy ? 'Processando…' : `Pagar selecionadas (${selected.size})`}
          </button>
        </section>

        <section className={styles.panel}>
          <header>
            <div>
              <span className={styles.eyebrow}>Fila administrativa</span>
              <h2>RDs aprovadas aguardando pagamento</h2>
            </div>
            <div className={styles.panelActions}>
              <button disabled={busy || loading} onClick={selectFirstBatch} type="button">
                {selected.size ? 'Alternar seleção' : `Selecionar até ${BATCH_LIMIT}`}
              </button>
              <button disabled={busy || loading} onClick={() => void load()} type="button">
                Atualizar
              </button>
            </div>
          </header>

          {loading && !queue ? (
            <div className={styles.empty}>Carregando despesas…</div>
          ) : queue && queue.groups.length === 0 ? (
            <div className={styles.empty}>Nenhuma despesa aprovada pendente de pagamento.</div>
          ) : queue ? (
            <div className={styles.groups}>
              {visibleGroups.map((group) => {
                const fullySelected = group.items.every((item) => selected.has(item.id));
                const open = expanded.has(group.key);
                const pixDisabled = !group.pix.trim() || group.itemCount > BATCH_LIMIT;

                return (
                  <article className={styles.group} key={group.key}>
                    <header className={styles.groupHeader}>
                      <label className={styles.groupSelect}>
                        <input
                          checked={fullySelected}
                          disabled={busy}
                          onChange={() => toggleGroup(group)}
                          type="checkbox"
                        />
                        <span>Selecionar grupo</span>
                      </label>
                      <div className={styles.groupIdentity}>
                        <strong>{group.userName}</strong>
                        <small>{group.descriptionPreview}</small>
                      </div>
                      <div className={styles.groupMoney}>
                        <span>{group.itemCount} RD(s)</span>
                        <strong>{currency.format(group.totalAmount)}</strong>
                      </div>
                      <div className={styles.pixInfo}>
                        <span>PIX</span>
                        <strong>{group.pix || 'não informado'}</strong>
                        <small>{group.pixTypeName || 'tipo não informado'}</small>
                      </div>
                      <div className={styles.groupActions}>
                        <button
                          className={styles.pixButton}
                          disabled={busy || qrBusy || pixDisabled}
                          onClick={() => void openPix(group)}
                          title={
                            group.itemCount > BATCH_LIMIT
                              ? `Grupo acima do limite de ${BATCH_LIMIT} RDs`
                              : !group.pix.trim()
                                ? 'Chave PIX não informada'
                                : 'Gerar QR Code PIX'
                          }
                          type="button"
                        >
                          {qrBusy ? 'Gerando…' : 'Pagar PIX'}
                        </button>
                        <button disabled={busy} onClick={() => toggleDetails(group.key)} type="button">
                          {open ? 'Ocultar detalhes' : 'Ver detalhes'}
                        </button>
                      </div>
                    </header>

                    {open ? (
                      <div className={styles.tableWrap}>
                        <table>
                          <thead>
                            <tr>
                              <th></th>
                              <th>ID / Data</th>
                              <th>Categoria / Cliente</th>
                              <th>Valor</th>
                              <th>Descrição do usuário</th>
                              <th>Obs. aprovador</th>
                              <th>Obs. pagamento / Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((item) => (
                              <tr key={item.id}>
                                <td>
                                  <input
                                    aria-label={`Selecionar RD ${item.id}`}
                                    checked={selected.has(item.id)}
                                    disabled={busy}
                                    onChange={() => toggleItem(item.id)}
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
                                <td className={styles.money}>{currency.format(item.amount)}</td>
                                <td className={styles.textCell}>{item.userRemarks || '—'}</td>
                                <td className={styles.textCell}>{item.approvalRemarks || '—'}</td>
                                <td className={styles.decision}>
                                  <textarea
                                    disabled={busy}
                                    maxLength={255}
                                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                                      setRemarks((current) => ({
                                        ...current,
                                        [item.id]: event.target.value,
                                      }))
                                    }
                                    placeholder="Obs. de pagamento"
                                    value={remarks[item.id] ?? ''}
                                  />
                                  <div>
                                    <button
                                      className={styles.pay}
                                      disabled={busy}
                                      onClick={() => pay(item)}
                                      type="button"
                                    >
                                      Pagar
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
                  </article>
                );
              })}
            </div>
          ) : null}

          {queue && queue.groups.length > PAGE_SIZE ? (
            <nav className={styles.pagination} aria-label="Paginação dos grupos de RDs">
              <button
                disabled={page <= 1 || busy}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                disabled={page >= totalPages || busy}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                type="button"
              >
                Próxima
              </button>
            </nav>
          ) : null}
        </section>
        <p className={styles.batchNote}>
          Pagamentos em lote aceitam até {BATCH_LIMIT} RDs e são atômicos por operação.
        </p>
      </div>

      {pixDialog ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-labelledby="pix-payment-title"
            aria-modal="true"
            className={styles.modal}
            role="dialog"
          >
            <header>
              <div>
                <span className={styles.eyebrow}>Pagamento bancário</span>
                <h2 id="pix-payment-title">Pagar com PIX QR Code</h2>
              </div>
              <button onClick={() => setPixDialog(null)} type="button" aria-label="Fechar">
                ×
              </button>
            </header>
            <div className={styles.modalBody}>
              <div className={styles.pixSummary}>
                <strong>{pixDialog.group.userName}</strong>
                <span>{currency.format(pixDialog.group.totalAmount)}</span>
                <small>
                  {pixDialog.group.itemCount} RD(s) · {pixDialog.group.pixTypeName || 'PIX'} ·{' '}
                  {pixDialog.group.pix}
                </small>
              </div>
              <img
                alt="QR Code PIX"
                className={styles.qrCode}
                height={320}
                src={pixDialog.dataUrl}
                width={320}
              />
              <p className={styles.pixDescription}>{pixDialog.group.descriptionPreview}</p>
              <label className={styles.copyPaste}>
                PIX copia e cola
                <textarea readOnly value={pixDialog.payload} />
              </label>
              <div className={styles.modalActions}>
                <button disabled={busy} onClick={() => void copyPixPayload()} type="button">
                  Copiar código PIX
                </button>
                <button
                  className={styles.pay}
                  disabled={busy}
                  onClick={compensatePixGroup}
                  type="button"
                >
                  {busy ? 'Processando…' : 'Compensar como pago'}
                </button>
              </div>
              <small className={styles.modalWarning}>
                Só compense depois de confirmar o pagamento no aplicativo do banco.
              </small>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

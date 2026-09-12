"use client";

import type {
  CreateLogisticsExpenseRequest,
  CurrentUserResponse,
  LogisticsExpenseItem,
  LogisticsExpenseManagementResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import {
  createExpense,
  deleteExpense,
  deleteExpenseAttachment,
  getExpenseManagement,
  updateExpense,
  uploadExpenseAttachment,
} from '../api/expense-management-api';
import styles from './expense-management-screen.module.css';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const STATUS: Record<number, string> = {
  1: 'Aguardando Aprovação',
  2: 'Aprovado p/ Pagamento',
  3: 'Pagamento Negado',
  4: 'Pagamento Concluído',
};

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
    if (Array.isArray(message)) return message.join(' ');
  }
  return 'Não foi possível concluir a operação.';
}

function formatDate(value: string): string {
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

function emptyRequest(
  data: LogisticsExpenseManagementResponse,
): CreateLogisticsExpenseRequest {
  return {
    amount: 0,
    categoryId: data.categories[0]?.id ?? 0,
    clientId: data.clients[0]?.id ?? 0,
    pixTypeId: data.profile.pixTypeId ?? data.pixTypes[0]?.id ?? 0,
    pix: data.profile.pix,
    remarks: '',
  };
}

export function ExpenseManagementScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const [data, setData] =
    useState<LogisticsExpenseManagementResponse | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [dialog, setDialog] = useState<{
    mode: 'create' | 'edit' | 'duplicate';
    expense?: LogisticsExpenseItem;
  } | null>(null);

  const load = useCallback(async (start?: string, end?: string) => {
    try {
      setLoading(true);
      setFeedback('');
      const response = await getExpenseManagement(start, end);
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

  async function run(operation: () => Promise<void>, success: string) {
    try {
      setFeedback('');
      await operation();
      setFeedback(success);
      await load(startDate, endDate);
    } catch (reason) {
      setFeedback(errorMessage(reason));
    }
  }

  const total = useMemo(
    () => data?.expenses.reduce((sum, item) => sum + item.amount, 0) ?? 0,
    [data],
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <AppSidebar />
          <Link className={styles.brand} href="/logistics/expenses">
            <strong>Helpdesk</strong>
            <span>Logística · Gerenciar RD</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className={styles.content}>
        <section className={styles.toolbar}>
          <div>
            <span className={styles.eyebrow}>Autosserviço</span>
            <h1>Minhas Despesas</h1>
            <p>{data?.profile.userName ?? 'Usuário autenticado'}</p>
          </div>

          <div className={styles.actions}>
            <Link href="/logistics/expenses">Resumo</Link>
            <button
              disabled={!data}
              onClick={() => setDialog({ mode: 'create' })}
              type="button"
            >
              + Nova despesa
            </button>
          </div>
        </section>

        <section className={styles.filters}>
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
          <button
            disabled={loading}
            onClick={() => void load(startDate, endDate)}
            type="button"
          >
            {loading ? 'Atualizando…' : 'Filtrar'}
          </button>
          <span>
            {data?.expenses.length ?? 0} registro(s) · {currency.format(total)}
          </span>
        </section>

        {feedback ? <div className={styles.feedback}>{feedback}</div> : null}
        {loading && !data ? (
          <div className={styles.feedback}>Carregando despesas…</div>
        ) : null}

        {data ? (
          <section className={styles.tablePanel}>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Categoria</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Anexos</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.length === 0 ? (
                    <tr>
                      <td className={styles.empty} colSpan={9}>
                        Nenhuma despesa encontrada no período.
                      </td>
                    </tr>
                  ) : (
                    data.expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>{expense.id}</td>
                        <td>{expense.clientName}</td>
                        <td>{expense.categoryName}</td>
                        <td>{expense.remarks || '—'}</td>
                        <td>{currency.format(expense.amount)}</td>
                        <td>
                          <div className={styles.attachments}>
                            {expense.attachments.length === 0 ? (
                              expense.categoryId === 43 ? (
                                <span className={styles.pending}>
                                  Nota pendente
                                </span>
                              ) : (
                                <span>—</span>
                              )
                            ) : (
                              expense.attachments.map((attachment) => (
                                <a
                                  href={attachment.contentUrl}
                                  key={attachment.key}
                                  rel="noreferrer"
                                  target="_blank"
                                  title={attachment.name}
                                >
                                  PDF
                                </a>
                              ))
                            )}
                          </div>
                        </td>
                        <td>{formatDate(expense.createdAt)}</td>
                        <td>
                          <span
                            className={`${styles.status} ${
                              styles[`status${expense.status}`]
                            }`}
                          >
                            {STATUS[expense.status]}
                          </span>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            {expense.canEdit ? (
                              <>
                                <button
                                  onClick={() =>
                                    setDialog({
                                      mode: 'edit',
                                      expense,
                                    })
                                  }
                                  type="button"
                                >
                                  Editar
                                </button>
                                <button
                                  className={styles.danger}
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Excluir a despesa #${expense.id}?`,
                                      )
                                    ) {
                                      void run(
                                        () => deleteExpense(expense.id),
                                        'Despesa excluída.',
                                      );
                                    }
                                  }}
                                  type="button"
                                >
                                  Excluir
                                </button>
                              </>
                            ) : null}
                            <button
                              onClick={() =>
                                setDialog({
                                  mode: 'duplicate',
                                  expense,
                                })
                              }
                              type="button"
                            >
                              Duplicar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>

      {data && dialog ? (
        <ExpenseDialog
          data={data}
          expense={dialog.expense}
          mode={dialog.mode}
          onClose={() => setDialog(null)}
          onSaved={async (message) => {
            setDialog(null);
            setFeedback(message);
            await load(startDate, endDate);
          }}
        />
      ) : null}
    </main>
  );
}

function ExpenseDialog({
  data,
  expense,
  mode,
  onClose,
  onSaved,
}: {
  data: LogisticsExpenseManagementResponse;
  expense?: LogisticsExpenseItem;
  mode: 'create' | 'edit' | 'duplicate';
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const seed = expense
    ? {
        amount: expense.amount,
        categoryId: expense.categoryId,
        clientId: expense.clientId ?? data.clients[0]?.id ?? 0,
        pixTypeId:
          expense.pixTypeId ??
          data.profile.pixTypeId ??
          data.pixTypes[0]?.id ??
          0,
        pix: expense.pix || data.profile.pix,
        remarks: expense.remarks,
      }
    : emptyRequest(data);

  const [value, setValue] = useState<CreateLogisticsExpenseRequest>(seed);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      value.amount <= 0 ||
      value.categoryId < 1 ||
      value.clientId < 1 ||
      value.pixTypeId < 1
    ) {
      setFeedback('Preencha valor, categoria, cliente e tipo de PIX.');
      return;
    }

    try {
      setBusy(true);
      setFeedback('');

      let id: number;
      if (mode === 'edit' && expense) {
        await updateExpense(expense.id, value);
        id = expense.id;
      } else {
        const created = await createExpense(value);
        id = created.id;
      }

      for (const file of files) {
        await uploadExpenseAttachment(id, file);
      }

      await onSaved(
        mode === 'edit'
          ? 'Despesa atualizada.'
          : mode === 'duplicate'
            ? 'Despesa duplicada.'
            : 'Despesa criada.',
      );
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function removeAttachment(key: string) {
    if (!expense || mode !== 'edit') return;

    try {
      setBusy(true);
      setFeedback('');
      await deleteExpenseAttachment(expense.id, key);
      await onSaved('Anexo removido.');
    } catch (reason) {
      setFeedback(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.modalBackdrop}>
      <form className={styles.modal} onSubmit={submit}>
        <header>
          <div>
            <span className={styles.eyebrow}>RD</span>
            <h2>
              {mode === 'edit'
                ? `Editar #${expense?.id}`
                : mode === 'duplicate'
                  ? `Duplicar #${expense?.id}`
                  : 'Nova despesa'}
            </h2>
          </div>
          <button disabled={busy} onClick={onClose} type="button">
            ×
          </button>
        </header>

        <div className={styles.formGrid}>
          <label>
            Valor
            <input
              min="0.01"
              required
              step="0.01"
              type="number"
              value={value.amount || ''}
              onChange={(event) =>
                setValue({
                  ...value,
                  amount: Number(event.target.value),
                })
              }
            />
          </label>

          <label>
            Categoria
            <select
              required
              value={value.categoryId || ''}
              onChange={(event) =>
                setValue({
                  ...value,
                  categoryId: Number(event.target.value),
                })
              }
            >
              <option value="">Selecione</option>
              {data.categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Cliente
            <select
              required
              value={value.clientId || ''}
              onChange={(event) =>
                setValue({
                  ...value,
                  clientId: Number(event.target.value),
                })
              }
            >
              <option value="">Selecione</option>
              {data.clients.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tipo de chave PIX
            <select
              required
              value={value.pixTypeId || ''}
              onChange={(event) =>
                setValue({
                  ...value,
                  pixTypeId: Number(event.target.value),
                })
              }
            >
              <option value="">Selecione</option>
              {data.pixTypes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.wide}>
            Chave PIX
            <input
              maxLength={255}
              value={value.pix ?? ''}
              onChange={(event) =>
                setValue({ ...value, pix: event.target.value })
              }
            />
          </label>

          <label className={styles.wide}>
            Observações
            <textarea
              maxLength={5000}
              rows={3}
              value={value.remarks ?? ''}
              onChange={(event) =>
                setValue({ ...value, remarks: event.target.value })
              }
            />
          </label>

          {mode === 'edit' && expense?.attachments.length ? (
            <div className={styles.existingAttachments}>
              <strong>Anexos existentes</strong>
              {expense.attachments.map((attachment) => (
                <div key={attachment.key}>
                  <a
                    href={attachment.contentUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {attachment.name}
                  </a>
                  <button
                    className={styles.danger}
                    disabled={busy}
                    onClick={() => void removeAttachment(attachment.key)}
                    type="button"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <label className={styles.wide}>
            Novos comprovantes PDF
            <input
              accept="application/pdf,.pdf"
              multiple
              type="file"
              onChange={(event) =>
                setFiles(Array.from(event.target.files ?? []))
              }
            />
            <small>
              Até 25 MB por arquivo. Somente PDFs válidos.
            </small>
          </label>
        </div>

        {feedback ? <div className={styles.modalFeedback}>{feedback}</div> : null}

        <footer>
          <button disabled={busy} onClick={onClose} type="button">
            Cancelar
          </button>
          <button className={styles.primary} disabled={busy} type="submit">
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </footer>
      </form>
    </div>
  );
}

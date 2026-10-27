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
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { DateRangePicker } from '../../../shared/ui/date-range-picker';
import {
  createExpense,
  deleteExpense,
  deleteExpenseAttachment,
  getExpenseManagement,
  updateExpense,
  uploadExpenseAttachment,
} from '../api/expense-management-api';
const styles = {
  page:
    'min-h-screen bg-app-bg text-app-text',
  header:
    'sticky top-0 z-20 flex min-h-[58px] items-center justify-between gap-[18px] border-b border-app-border bg-[var(--app-header-bg)] px-6 backdrop-blur-xl max-[720px]:px-3',
  headerLeft:
    'flex items-center gap-3',
  brand:
    'grid text-inherit no-underline [&_strong]:text-[15px] [&_span]:text-[10px] [&_span]:text-app-subtle',
  content:
    'mx-auto w-[min(1500px,calc(100%-28px))] py-5 pb-12',
  toolbar:
    'flex items-end justify-between gap-4 rounded-[11px] border border-app-border bg-app-surface px-[18px] py-4 max-[720px]:flex-col max-[720px]:items-stretch [&_h1]:my-0.5 [&_h1]:text-2xl [&_p]:m-0 [&_p]:text-[10px] [&_p]:text-app-muted',
  eyebrow:
    'text-[8px] font-black uppercase tracking-[0.08em] text-app-muted',
  actions:
    'flex flex-wrap gap-1.5 [&_a]:inline-flex [&_a]:min-h-8 [&_a]:items-center [&_a]:rounded-[7px] [&_a]:border [&_a]:border-app-border-strong [&_a]:bg-app-surface [&_a]:px-2.5 [&_a]:text-inherit [&_a]:no-underline [&_a]:transition [&_a:hover]:bg-app-surface-hover [&_button]:min-h-8 [&_button]:cursor-pointer [&_button]:rounded-[7px] [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-2.5 [&_button]:text-inherit [&_button]:transition [&_button:hover]:bg-app-surface-hover [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-60',
  filters:
    'mt-2.5 flex items-end gap-[9px] rounded-[11px] border border-app-border bg-app-surface px-4 py-3 shadow-sm max-[720px]:flex-col max-[720px]:items-stretch [&_label]:grid [&_label]:gap-[3px] [&_label]:text-[11px] [&_label]:font-extrabold [&_label]:uppercase [&_label]:text-app-muted [&_input]:min-h-[34px] [&_input]:rounded-[7px] [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-2 [&_input]:text-app-text [&_input]:outline-none [&_input:focus]:border-app-brand [&_input:focus]:ring-[3px] [&_input:focus]:ring-[var(--app-brand-ring)] [&_button]:min-h-8 [&_button]:cursor-pointer [&_button]:rounded-[7px] [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-2.5 [&_button]:text-inherit [&_button]:transition [&_button:hover]:bg-app-surface-hover [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-60 [&_span]:ml-auto [&_span]:text-[11px] [&_span]:text-app-subtle max-[720px]:[&_span]:ml-0',
  feedback:
    'mt-2.5 rounded-lg border border-app-border bg-app-surface px-3 py-2.5 text-sm text-app-text-soft',
  tablePanel:
    'mt-3 overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm',
  tableWrap:
    'overflow-x-auto [&_table]:w-full [&_table]:min-w-[1150px] [&_table]:border-collapse [&_table]:text-[13px] [&_th]:border-b [&_th]:border-app-border-soft [&_th]:px-2.5 [&_th]:py-[9px] [&_th]:text-left [&_th]:align-top [&_td]:border-b [&_td]:border-app-border-soft [&_td]:px-2.5 [&_td]:py-[9px] [&_td]:text-left [&_td]:align-top [&_th]:bg-app-surface-muted [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-[0.04em] [&_th]:text-app-muted [&_td:nth-child(5)]:text-right [&_th:nth-child(5)]:text-right',
  empty:
    'text-center! text-app-subtle',
  status:
    'inline-flex whitespace-nowrap rounded-full px-1.5 py-1 text-[8px] font-extrabold',
  status1:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  status2:
    'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
  status3:
    'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200',
  status4:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
  attachments:
    'flex flex-wrap gap-1 [&_a]:rounded-[5px] [&_a]:bg-app-brand-soft [&_a]:px-[5px] [&_a]:py-[3px] [&_a]:text-app-brand [&_a]:no-underline',
  pending:
    'text-[8px] font-extrabold uppercase text-app-danger',
  rowActions:
    'flex flex-wrap gap-1.5 [&_button]:min-h-8 [&_button]:cursor-pointer [&_button]:rounded-[7px] [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-1.5 [&_button]:text-xs [&_button]:text-inherit [&_button]:transition [&_button:hover]:bg-app-surface-hover [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-60',
  danger:
    'border-red-300! text-red-700! dark:border-red-900! dark:text-red-300!',
  modalBackdrop:
    'fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-[18px]',
  modal:
    'max-h-[calc(100vh-32px)] w-[min(820px,100%)] overflow-auto rounded-2xl border border-app-border bg-app-surface shadow-2xl [&>header]:flex [&>header]:items-center [&>header]:justify-between [&>header]:gap-3 [&>header]:border-b [&>header]:border-app-border-soft [&>header]:px-6 [&>header]:py-5 [&>footer]:flex [&>footer]:items-center [&>footer]:justify-end [&>footer]:gap-3 [&>footer]:border-t [&>footer]:border-app-border-soft [&>footer]:px-6 [&>footer]:py-4 [&_h2]:mt-0.5 [&_h2]:mb-0 [&_h2]:text-base [&_button]:min-h-8 [&_button]:cursor-pointer [&_button]:rounded-[7px] [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-2.5 [&_button]:text-inherit [&_button]:transition [&_button:hover]:bg-app-surface-hover [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-60',
  formGrid:
    'grid grid-cols-2 gap-4 p-6 max-[720px]:grid-cols-1 max-[720px]:p-4 [&_label]:grid [&_label]:gap-1 [&_label]:text-xs [&_label]:font-semibold [&_label]:text-app-muted [&_input]:min-h-10 [&_input]:w-full [&_input]:rounded-[7px] [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-2 [&_input]:py-1.5 [&_input]:text-app-text [&_input]:outline-none [&_select]:min-h-10 [&_select]:w-full [&_select]:rounded-[7px] [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-2 [&_select]:py-1.5 [&_select]:text-app-text [&_select]:outline-none [&_textarea]:min-h-10 [&_textarea]:w-full [&_textarea]:rounded-[7px] [&_textarea]:border [&_textarea]:border-app-border-strong [&_textarea]:bg-app-surface [&_textarea]:px-2 [&_textarea]:py-1.5 [&_textarea]:text-app-text [&_textarea]:outline-none [&_input:focus]:border-app-brand [&_select:focus]:border-app-brand [&_textarea:focus]:border-app-brand [&_input:focus]:ring-[3px] [&_select:focus]:ring-[3px] [&_textarea:focus]:ring-[3px] [&_input:focus]:ring-[var(--app-brand-ring)] [&_select:focus]:ring-[var(--app-brand-ring)] [&_textarea:focus]:ring-[var(--app-brand-ring)] [&_input[type=file]]:p-[5px] [&_small]:text-[8px] [&_small]:text-app-subtle',
  wide:
    'col-span-full max-[720px]:col-auto',
  existingAttachments:
    'col-span-full grid gap-1.5 rounded-lg border border-app-border-soft bg-app-surface-muted p-2.5 text-[9px] max-[720px]:col-auto [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:gap-2.5 [&_a]:min-w-0 [&_a]:overflow-hidden [&_a]:text-ellipsis [&_a]:whitespace-nowrap [&_a]:text-app-brand [&_button]:min-h-[26px] [&_button]:text-[8px]',
  modalFeedback:
    'mx-3.5 mb-3 mt-0 rounded-[7px] border border-app-danger-border bg-app-danger-soft px-2.5 py-[9px] text-[9px] text-app-danger',
  primary:
    'border-app-brand! bg-app-brand! text-white! hover:opacity-90',
} as const;

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
    clientId: data.clients.find((client) => /^n[ií]vel 3(?:\b|\s|$)/i.test(client.name.trim()))?.id ?? data.clients[0]?.id ?? 0,
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

  useEffect(() => {
    if (!data || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('novo') !== '1') return;
    setDialog({ mode: 'create' });
    params.delete('novo');
    const query = params.toString();
    window.history.replaceState(window.history.state, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
  }, [data]);

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
      <AppPageHeader
        actions={
          <div className={styles.actions}>
            <Link href="/logistica/despesas">Resumo</Link>
            <button
              disabled={!data}
              onClick={() => setDialog({ mode: 'create' })}
              type="button"
            >
              + Nova despesa
            </button>
          </div>
        }
        subtitle={data?.profile.userName ?? 'Usuário autenticado'}
        title="Gerenciar Despesas"
        user={currentUser}
      />

      <div className={styles.content}>

        <section className={styles.filters}>
          <div className="min-w-[300px] max-[720px]:w-full">
            <span className="mb-1 block text-[8px] font-extrabold uppercase text-app-muted">Período</span>
            <DateRangePicker
              disabled={loading}
              endDate={endDate}
              onChange={(range) => {
                setStartDate(range.startDate);
                setEndDate(range.endDate);
              }}
              startDate={startDate}
            />
          </div>
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
  const [amountText, setAmountText] = useState(seed.amount ? currency.format(seed.amount) : '');
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

    if (files.some((file) => file.size > 25 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type))) {
      setFeedback('Selecione apenas PDF, JPG ou PNG de até 25 MB por arquivo.');
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
    <div className={styles.modalBackdrop} role="presentation">
      <form aria-label="Formulário de despesa" className={`${styles.modal} !w-[min(760px,100%)] rounded-2xl shadow-2xl`} onSubmit={submit}>
        <header>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-app-brand">Requisição de despesa</span>
            <h2>
              {mode === 'edit'
                ? `Editar #${expense?.id}`
                : mode === 'duplicate'
                  ? `Duplicar #${expense?.id}`
                  : 'Nova despesa'}
            </h2>
          </div>
          <button aria-label="Fechar formulário" disabled={busy} onClick={onClose} type="button">
            ×
          </button>
        </header>

        <div className={styles.formGrid}>
          <label>
            Valor (R$)
            <input
              inputMode="numeric"
              placeholder="R$ 0,00"
              required
              type="text"
              value={amountText}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
                const amount = Number(digits) / 100;
                setAmountText(digits ? currency.format(amount) : '');
                setValue((current) => ({ ...current, amount }));
              }}
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

          <div className={styles.wide}>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-app-border-strong bg-app-surface-muted px-5 py-6 text-center transition hover:border-app-brand hover:bg-app-brand-soft">
              <span className="text-sm font-semibold text-app-text">Adicionar comprovantes</span>
              <span className="text-xs font-normal text-app-muted">Clique para selecionar PDF, JPG ou PNG · até 25 MB por arquivo</span>
              <input
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="sr-only!"
                multiple
                type="file"
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []);
                  setFiles(selected);
                  if (selected.some((file) => file.size > 25 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type))) {
                    setFeedback('Apenas PDF, JPG e PNG com até 25 MB são permitidos.');
                  } else {
                    setFeedback('');
                  }
                }}
              />
            </label>
            {files.length ? (
              <ul className="mt-3 grid gap-2 text-xs text-app-text-soft">
                {files.map((file, index) => (
                  <li className="flex items-center justify-between gap-2 rounded-lg border border-app-border p-2" key={`${file.name}-${index}`}>
                    <span className="min-w-0 truncate">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    <button className="text-app-danger" type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>Remover</button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {feedback ? <div className={styles.modalFeedback}>{feedback}</div> : null}

        <footer>
          <button disabled={busy} onClick={onClose} type="button">
            Cancelar
          </button>
          <button className={`${styles.primary} !min-h-10 !px-5 !text-sm !font-bold`} disabled={busy} type="submit">
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </footer>
      </form>
    </div>
  );
}

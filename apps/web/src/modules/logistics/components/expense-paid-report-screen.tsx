"use client";

import {
  AppPermission,
  PermissionScope,
  type CurrentUserResponse,
  type LogisticsExpensePaidAdminEditResponse,
  type LogisticsExpensePaidReportResponse,
} from '@helpdesk/contracts';
import Link from 'next/link';
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import {
  type ExpensePaidReportFilters,
  getExpensePaidAdminEdit,
  getExpensePaidReport,
  updateExpensePaidAdmin,
} from '../api/expense-paid-report-api';
const styles = {
  page:
    'min-h-screen bg-app-bg text-app-text print:bg-white',
  header:
    'sticky top-0 z-20 flex min-h-16 items-center justify-between gap-5 border-b border-app-border bg-[var(--app-header-bg)] px-6 py-2 backdrop-blur-xl max-[560px]:px-3 print:hidden',
  headerLeft:
    'flex items-center gap-3.5',
  brand:
    'flex flex-col text-inherit no-underline [&_strong]:text-base [&_span]:text-[0.78rem] [&_span]:text-app-muted',
  content:
    'mx-auto w-[min(1500px,calc(100%-32px))] py-6 pb-12 max-[560px]:w-[min(1500px,calc(100%-20px))] print:w-full print:p-0',
  hero:
    'mb-4 flex items-center justify-between gap-6 max-[900px]:flex-col max-[900px]:items-start [&_h1]:mt-1 [&_h1]:mb-1.5 [&_h1]:text-[clamp(1.7rem,3vw,2.35rem)] [&_p]:m-0 [&_p]:text-app-muted',
  eyebrow:
    'text-[0.78rem] text-app-muted',
  backLink:
    'inline-flex min-h-10 items-center rounded-lg border border-app-border-strong bg-app-surface px-3.5 font-bold text-app-text-soft no-underline transition hover:bg-app-surface-hover print:hidden',
  notice:
    'mb-4 flex flex-wrap gap-2 rounded-[10px] border border-app-border bg-app-surface px-3.5 py-3 [&_span]:text-app-muted print:hidden',
  feedback:
    'mb-4 rounded-[10px] border border-app-border bg-app-surface px-3.5 py-3 text-app-text-soft',
  filters:
    'mb-4 grid grid-cols-4 gap-3 rounded-[10px] border border-app-border bg-app-surface p-4 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1 print:hidden [&_label]:flex [&_label]:flex-col [&_label]:gap-1.5 [&_label]:text-[0.82rem] [&_label]:font-bold [&_input]:min-h-10 [&_input]:rounded-lg [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-2.5 [&_input]:py-2 [&_input]:text-app-text [&_input]:outline-none [&_select]:min-h-10 [&_select]:rounded-lg [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-2.5 [&_select]:py-2 [&_select]:text-app-text [&_select]:outline-none [&_input:focus]:border-app-brand [&_select:focus]:border-app-brand [&_input:focus]:ring-[3px] [&_select:focus]:ring-[3px] [&_input:focus]:ring-[var(--app-brand-ring)] [&_select:focus]:ring-[var(--app-brand-ring)] [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-2.5 [&_button]:py-2 [&_button]:text-app-text [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-[0.55]',
  categoryField:
    '[&_select]:min-h-[92px]',
  filterActions:
    'flex self-end gap-2 max-[560px]:w-full max-[560px]:flex-wrap [&_button:first-child]:border-app-brand [&_button:first-child]:bg-app-brand [&_button:first-child]:font-extrabold [&_button:first-child]:text-white',
  reportCard:
    'overflow-hidden rounded-[10px] border border-app-border bg-app-surface print:border-0 print:bg-white',
  reportHeader:
    'flex items-center justify-between gap-4 border-b border-app-border px-4 py-4 max-[900px]:flex-col max-[900px]:items-start [&>div:first-child]:flex [&>div:first-child]:flex-col [&>div:first-child]:gap-1 [&_span]:text-[0.78rem] [&_span]:text-app-muted [&_strong]:text-[1.4rem]',
  reportActions:
    'flex gap-2 print:hidden [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-2.5 [&_button]:py-2 [&_button:first-child]:border-app-brand [&_button:first-child]:bg-app-brand [&_button:first-child]:font-extrabold [&_button:first-child]:text-white max-[560px]:w-full max-[560px]:flex-wrap',
  tableWrap:
    'overflow-x-auto print:overflow-visible [&_table]:w-full [&_table]:border-collapse [&_table]:text-[0.86rem] [&_th]:border-b [&_th]:border-app-border-soft [&_th]:px-[9px] [&_th]:py-2.5 [&_th]:text-left [&_th]:align-top [&_td]:border-b [&_td]:border-app-border-soft [&_td]:px-[9px] [&_td]:py-2.5 [&_td]:text-left [&_td]:align-top [&_thead_th]:whitespace-nowrap [&_thead_th]:bg-app-surface-muted [&_tbody_tr:hover]:bg-app-surface-hover [&_tfoot_th]:bg-app-surface-muted [&_tfoot_th]:font-extrabold',
  amountCell:
    'whitespace-nowrap text-right!',
  emptyCell:
    'p-[30px]! text-center! text-app-muted',
  printOnlyRow:
    'hidden print:table-row',
  pagination:
    'flex items-center justify-center gap-2 p-3.5 print:hidden [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-2.5 [&_button]:py-2 [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-[0.55]',
  actionsColumn:
    'w-[88px] whitespace-nowrap text-center! print:hidden',
  editButton:
    'min-h-[34px] cursor-pointer rounded-[7px] border border-sky-200 bg-sky-50 px-2.5 py-1.5 font-extrabold text-sky-800 transition hover:bg-sky-100 dark:border-sky-900/70 dark:bg-sky-950/35 dark:text-sky-200 dark:hover:bg-sky-950/55',
  modalBackdrop:
    'fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-5 max-[620px]:p-2 print:hidden',
  modal:
    'max-h-[calc(100vh-40px)] w-[min(760px,100%)] overflow-auto rounded-[14px] border border-app-border bg-app-surface shadow-2xl max-[620px]:max-h-[calc(100vh-16px)]',
  modalHeader:
    'flex items-start justify-between gap-4 border-b border-app-border-soft px-5 py-[18px] max-[620px]:px-3.5 [&>div]:flex [&>div]:flex-col [&>div]:gap-1 [&_span]:text-[0.78rem] [&_span]:font-extrabold [&_span]:uppercase [&_span]:tracking-[0.04em] [&_span]:text-app-muted [&_h2]:m-0 [&_h2]:text-[1.35rem] [&_button]:min-h-[38px] [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-3 [&_button]:font-bold [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-60',
  modalFeedback:
    'mx-5 my-4 rounded-[9px] border border-app-border bg-app-bg px-3.5 py-3 text-app-text-soft',
  modalError:
    'mx-5 my-4 rounded-[9px] border border-app-danger-border bg-app-danger-soft px-3.5 py-3 text-app-danger',
  editForm:
    'px-5 pb-5 pt-[18px] max-[620px]:px-3.5 [&_input]:w-full [&_input]:min-h-[42px] [&_input]:rounded-lg [&_input]:border [&_input]:border-app-border-strong [&_input]:bg-app-surface [&_input]:px-2.5 [&_input]:py-2 [&_input]:text-app-text [&_input]:outline-none [&_select]:w-full [&_select]:min-h-[42px] [&_select]:rounded-lg [&_select]:border [&_select]:border-app-border-strong [&_select]:bg-app-surface [&_select]:px-2.5 [&_select]:py-2 [&_select]:text-app-text [&_select]:outline-none [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-app-border-strong [&_textarea]:bg-app-surface [&_textarea]:px-2.5 [&_textarea]:py-2 [&_textarea]:text-app-text [&_textarea]:outline-none [&_input:focus]:border-app-brand [&_select:focus]:border-app-brand [&_textarea:focus]:border-app-brand [&_input:focus]:ring-[3px] [&_select:focus]:ring-[3px] [&_textarea:focus]:ring-[3px] [&_input:focus]:ring-[var(--app-brand-ring)] [&_select:focus]:ring-[var(--app-brand-ring)] [&_textarea:focus]:ring-[var(--app-brand-ring)] [&_input:disabled]:cursor-not-allowed [&_select:disabled]:cursor-not-allowed [&_textarea:disabled]:cursor-not-allowed [&_input:disabled]:opacity-60 [&_select:disabled]:opacity-60 [&_textarea:disabled]:opacity-60',
  editMeta:
    'mb-4 flex flex-wrap gap-x-5 gap-y-3 rounded-[9px] border border-app-border-soft bg-app-surface-muted px-3.5 py-3 text-[0.84rem] text-app-text-soft',
  editGrid:
    'grid grid-cols-2 gap-3.5 max-[620px]:grid-cols-1 [&_label]:flex [&_label]:flex-col [&_label]:gap-1.5 [&_label]:text-[0.84rem] [&_label]:font-extrabold',
  wideField:
    'col-span-full max-[620px]:col-auto',
  editWarning:
    'mt-4 rounded-lg border border-amber-200 bg-amber-50 px-[13px] py-[11px] text-[0.82rem] text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200',
  modalActions:
    'mt-[18px] flex justify-end gap-2 max-[620px]:flex-col-reverse [&_button]:min-h-[38px] [&_button]:cursor-pointer [&_button]:rounded-lg [&_button]:border [&_button]:border-app-border-strong [&_button]:bg-app-surface [&_button]:px-3 [&_button]:font-bold max-[620px]:[&_button]:w-full [&_button:last-child]:border-app-brand [&_button:last-child]:bg-app-brand [&_button:last-child]:text-white [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-60',
} as const;

const PAGE_SIZE = 10;
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface EditFormState {
  amount: string;
  categoryId: string;
  clientId: string;
  pixTypeId: string;
  pix: string;
  remarks: string;
}

const EMPTY_EDIT_FORM: EditFormState = {
  amount: '',
  categoryId: '',
  clientId: '',
  pixTypeId: '',
  pix: '',
  remarks: '',
};

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

function errorMessage(reason: unknown, fallback: string): string {
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
  return fallback;
}

function csvCell(value: string | number): string {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function editForm(
  response: LogisticsExpensePaidAdminEditResponse,
): EditFormState {
  return {
    amount: response.expense.amount.toFixed(2),
    categoryId:
      response.expense.categoryId === null
        ? ''
        : String(response.expense.categoryId),
    clientId:
      response.expense.clientId === null ? '' : String(response.expense.clientId),
    pixTypeId:
      response.expense.pixTypeId === null
        ? ''
        : String(response.expense.pixTypeId),
    pix: response.expense.pix,
    remarks: response.expense.remarks,
  };
}

export function ExpensePaidReportScreen({
  currentUser,
  initialFilters,
}: {
  currentUser: CurrentUserResponse;
  initialFilters: ExpensePaidReportFilters;
}) {
  const [report, setReport] =
    useState<LogisticsExpensePaidReportResponse | null>(null);
  const [startDate, setStartDate] = useState(initialFilters.startDate ?? '');
  const [endDate, setEndDate] = useState(initialFilters.endDate ?? '');
  const [userId, setUserId] = useState<number | null>(
    initialFilters.userId ?? null,
  );
  const [clientName, setClientName] = useState(initialFilters.clientName ?? '');
  const [categoryIds, setCategoryIds] = useState<number[]>(
    initialFilters.categoryIds ?? [],
  );
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] =
    useState<LogisticsExpensePaidAdminEditResponse | null>(null);
  const [editFormState, setEditFormState] =
    useState<EditFormState>(EMPTY_EDIT_FORM);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editFeedback, setEditFeedback] = useState('');

  const canManage = currentUser.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.LogisticsExpensesAdminManage,
  );

  const load = useCallback(async (filters: ExpensePaidReportFilters) => {
    try {
      setLoading(true);
      setFeedback('');
      const response = await getExpensePaidReport(filters);
      setReport(response);
      setStartDate(response.period.startDate);
      setEndDate(response.period.endDate);
      setUserId(response.filters.userId);
      setClientName(response.filters.clientName);
      setCategoryIds(response.filters.categoryIds);
      setPage(1);
    } catch (reason) {
      setFeedback(
        errorMessage(
          reason,
          'Não foi possível carregar o relatório de pagamentos.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(initialFilters);
  }, [initialFilters, load]);

  const totalPages = Math.max(
    1,
    Math.ceil((report?.items.length ?? 0) / PAGE_SIZE),
  );

  function filters(): ExpensePaidReportFilters {
    return {
      startDate,
      endDate,
      userId: userId ?? undefined,
      clientName: clientName || undefined,
      categoryIds,
    };
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(filters());
  }

  function clearFilters() {
    setUserId(null);
    setClientName('');
    setCategoryIds([]);
    void load({ startDate, endDate });
  }

  function exportCsv() {
    if (!report) return;
    const rows = [
      [
        'ID',
        'Pago em',
        'Colaborador',
        'Categoria',
        'Cliente',
        'Observações',
        'Valor',
      ],
      ...report.items.map((item) => [
        item.id,
        formatDate(item.paidAt),
        item.userName,
        item.categoryName,
        item.clientName,
        item.remarks,
        item.amount.toFixed(2).replace('.', ','),
      ]),
      [
        '',
        '',
        '',
        '',
        '',
        'Total',
        report.totalAmount.toFixed(2).replace('.', ','),
      ],
    ];
    const csv = `\uFEFF${rows
      .map((row) => row.map(csvCell).join(';'))
      .join('\r\n')}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download =
      `relatorio-rd-${report.period.startDate}-${report.period.endDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function openEdit(expenseId: number) {
    setEditId(expenseId);
    setEditData(null);
    setEditFormState(EMPTY_EDIT_FORM);
    setEditFeedback('');
    setEditLoading(true);
    try {
      const response = await getExpensePaidAdminEdit(expenseId);
      setEditData(response);
      setEditFormState(editForm(response));
    } catch (reason) {
      setEditFeedback(
        errorMessage(
          reason,
          'Não foi possível carregar a RD para edição administrativa.',
        ),
      );
    } finally {
      setEditLoading(false);
    }
  }

  function closeEdit() {
    if (editSaving) return;
    setEditId(null);
    setEditData(null);
    setEditFeedback('');
    setEditFormState(EMPTY_EDIT_FORM);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editData || editId === null) return;

    const amount = Number(editFormState.amount.replace(',', '.'));
    const categoryId = Number(editFormState.categoryId);
    if (!Number.isFinite(amount) || amount <= 0) {
      setEditFeedback('Informe um valor válido.');
      return;
    }
    if (!Number.isSafeInteger(categoryId) || categoryId < 1) {
      setEditFeedback('Selecione uma categoria válida.');
      return;
    }

    try {
      setEditSaving(true);
      setEditFeedback('');
      await updateExpensePaidAdmin(editId, {
        amount,
        categoryId,
        clientId: editFormState.clientId
          ? Number(editFormState.clientId)
          : null,
        pixTypeId: editFormState.pixTypeId
          ? Number(editFormState.pixTypeId)
          : null,
        pix: editFormState.pix,
        remarks: editFormState.remarks,
      });
      const updatedId = editId;
      setEditId(null);
      setEditData(null);
      setEditFormState(EMPTY_EDIT_FORM);
      await load(filters());
      setFeedback(`RD #${updatedId} atualizada com sucesso.`);
    } catch (reason) {
      setEditFeedback(
        errorMessage(
          reason,
          'Não foi possível salvar a edição administrativa.',
        ),
      );
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <AppSidebar />
          <Link className={styles.brand} href="/dashboard">
            <strong>Helpdesk</strong>
            <span>Logística · Relatório de RDs</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Logística · Administrativo</span>
            <h1>Relatório de Pagamentos</h1>
            <p>Consulta e manutenção administrativa das RDs pagas.</p>
          </div>
          <Link className={styles.backLink} href="/logistics/expenses/admin">
            Voltar à gestão
          </Link>
        </section>

        <section className={styles.notice}>
          <strong>Relatório e edição administrativa no fluxo nativo.</strong>
          <span>
            O cutover do detalharRD.php ocorre no 0042b; alterações são
            permitidas somente enquanto a RD permanecer paga e ativa.
          </span>
        </section>

        <form className={styles.filters} onSubmit={submit}>
          <label>
            De
            <input
              type="date"
              value={startDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setStartDate(event.target.value)
              }
            />
          </label>
          <label>
            Até
            <input
              type="date"
              value={endDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setEndDate(event.target.value)
              }
            />
          </label>
          <label>
            Cliente
            <select
              value={clientName}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setClientName(event.target.value)
              }
            >
              <option value="">Todos</option>
              {report?.options.clients.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {report?.scope === PermissionScope.All ? (
            <label>
              Colaborador
              <select
                value={userId ?? ''}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setUserId(
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
              >
                <option value="">Todos</option>
                {report.options.collaborators.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className={styles.categoryField}>
            Categorias
            <select
              multiple
              value={categoryIds.map(String)}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setCategoryIds(
                  Array.from(event.currentTarget.selectedOptions).map(
                    (option) => Number(option.value),
                  ),
                )
              }
            >
              {report?.options.categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.filterActions}>
            <button disabled={loading} type="submit">
              {loading ? 'Atualizando…' : 'Filtrar'}
            </button>
            <button disabled={loading} onClick={clearFilters} type="button">
              Limpar
            </button>
          </div>
        </form>

        {feedback ? <div className={styles.feedback}>{feedback}</div> : null}

        {report ? (
          <section className={styles.reportCard}>
            <header className={styles.reportHeader}>
              <div>
                <span>
                  {report.count} lançamento(s) · {report.period.startDate} até{' '}
                  {report.period.endDate}
                </span>
                <strong>{currency.format(report.totalAmount)}</strong>
              </div>
              <div className={styles.reportActions}>
                <button onClick={exportCsv} type="button">
                  Exportar CSV
                </button>
                <button onClick={() => window.print()} type="button">
                  Imprimir / Salvar PDF
                </button>
              </div>
            </header>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ID</th>
                    <th>Pago em</th>
                    <th>Colaborador</th>
                    <th>Categoria</th>
                    <th>Cliente</th>
                    <th>Observações</th>
                    <th className={styles.amountCell}>Valor</th>
                    {canManage ? (
                      <th className={styles.actionsColumn}>Ações</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {report.items.length === 0 ? (
                    <tr>
                      <td
                        className={styles.emptyCell}
                        colSpan={canManage ? 9 : 8}
                      >
                        Nenhum pagamento encontrado no período.
                      </td>
                    </tr>
                  ) : (
                    report.items.map((item, index) => {
                      const visible =
                        index >= (page - 1) * PAGE_SIZE &&
                        index < page * PAGE_SIZE;
                      return (
                        <tr
                          className={
                            visible ? undefined : styles.printOnlyRow
                          }
                          key={item.id}
                        >
                          <td>{index + 1}</td>
                          <td>{item.id}</td>
                          <td>{formatDate(item.paidAt)}</td>
                          <td>{item.userName}</td>
                          <td>{item.categoryName}</td>
                          <td>{item.clientName}</td>
                          <td>{item.remarks || '—'}</td>
                          <td className={styles.amountCell}>{currency.format(item.amount)}</td>
                          {canManage ? (
                            <td className={styles.actionsColumn}>
                              <button
                                className={styles.editButton}
                                onClick={() => void openEdit(item.id)}
                                type="button"
                              >
                                Editar
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={7}>Total geral</th>
                    <th className={styles.amountCell}>{currency.format(report.totalAmount)}</th>
                    {canManage ? (
                      <th className={styles.actionsColumn} aria-hidden="true" />
                    ) : null}
                  </tr>
                </tfoot>
              </table>
            </div>

            {totalPages > 1 ? (
              <nav
                className={styles.pagination}
                aria-label="Paginação do relatório"
              >
                <button
                  disabled={page === 1}
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  type="button"
                >
                  Anterior
                </button>
                <span>
                  Página {page} de {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1),
                    )
                  }
                  type="button"
                >
                  Próxima
                </button>
              </nav>
            ) : null}
          </section>
        ) : loading ? (
          <div className={styles.feedback}>Carregando relatório…</div>
        ) : null}
      </div>

      {editId !== null ? (
        <div className={styles.modalBackdrop}>
          <section
            aria-labelledby="expense-paid-admin-edit-title"
            aria-modal="true"
            className={styles.modal}
            role="dialog"
          >
            <header className={styles.modalHeader}>
              <div>
                <span>Gestão de RD paga</span>
                <h2 id="expense-paid-admin-edit-title">
                  Editar RD #{editId}
                </h2>
              </div>
              <button
                disabled={editSaving}
                onClick={closeEdit}
                type="button"
              >
                Fechar
              </button>
            </header>

            {editLoading ? (
              <div className={styles.modalFeedback}>
                Carregando dados da despesa…
              </div>
            ) : editData ? (
              <form className={styles.editForm} onSubmit={saveEdit}>
                <div className={styles.editMeta}>
                  <span>
                    <strong>Colaborador:</strong>{' '}
                    {editData.expense.userName}
                  </span>
                  <span>
                    <strong>Pago em:</strong>{' '}
                    {formatDate(editData.expense.paidAt)}
                  </span>
                  <span>
                    <strong>Catálogo:</strong>{' '}
                    {editData.expense.categoryCatalog === 'legacy'
                      ? 'Histórico'
                      : 'Atual'}
                  </span>
                </div>

                <div className={styles.editGrid}>
                  <label>
                    Valor
                    <input
                      disabled={editSaving}
                      min="0.01"
                      max="99999999.99"
                      step="0.01"
                      type="number"
                      value={editFormState.amount}
                      onChange={(event) =>
                        setEditFormState((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Categoria
                    <select
                      disabled={editSaving}
                      required
                      value={editFormState.categoryId}
                      onChange={(event) =>
                        setEditFormState((current) => ({
                          ...current,
                          categoryId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Selecione</option>
                      {editData.options.categories.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Cliente
                    <select
                      disabled={editSaving}
                      value={editFormState.clientId}
                      onChange={(event) =>
                        setEditFormState((current) => ({
                          ...current,
                          clientId: event.target.value,
                        }))
                      }
                    >
                      {editData.expense.clientId === null ? (
                        <option value="">
                          Manter: {editData.expense.clientName}
                        </option>
                      ) : (
                        <option value="">Manter cliente atual</option>
                      )}
                      {editData.options.clients.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Tipo de chave PIX
                    <select
                      disabled={editSaving}
                      value={editFormState.pixTypeId}
                      onChange={(event) =>
                        setEditFormState((current) => ({
                          ...current,
                          pixTypeId: event.target.value,
                        }))
                      }
                    >
                      {editData.expense.pixTypeId === null ? (
                        <option value="">
                          Manter: {editData.expense.pixTypeName}
                        </option>
                      ) : (
                        <option value="">Manter tipo atual</option>
                      )}
                      {editData.options.pixTypes.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.wideField}>
                    Chave PIX
                    <input
                      disabled={editSaving}
                      maxLength={255}
                      type="text"
                      value={editFormState.pix}
                      onChange={(event) =>
                        setEditFormState((current) => ({
                          ...current,
                          pix: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className={styles.wideField}>
                    Observações
                    <textarea
                      disabled={editSaving}
                      maxLength={5000}
                      rows={4}
                      value={editFormState.remarks}
                      onChange={(event) =>
                        setEditFormState((current) => ({
                          ...current,
                          remarks: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <p className={styles.editWarning}>
                  O pagamento e o status não são alterados por esta edição.
                  O timestamp original de pagamento também é preservado.
                </p>

                {editFeedback ? (
                  <div className={styles.modalError}>{editFeedback}</div>
                ) : null}

                <footer className={styles.modalActions}>
                  <button
                    disabled={editSaving}
                    onClick={closeEdit}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button disabled={editSaving} type="submit">
                    {editSaving ? 'Salvando…' : 'Salvar alterações'}
                  </button>
                </footer>
              </form>
            ) : (
              <div className={styles.modalError}>
                {editFeedback || 'Não foi possível abrir esta RD.'}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}

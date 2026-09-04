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
import styles from './expense-paid-report-screen.module.css';

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

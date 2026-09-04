"use client";

import {
  PermissionScope,
  type CurrentUserResponse,
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
  getExpensePaidReport,
} from '../api/expense-paid-report-api';
import styles from './expense-paid-report-screen.module.css';

const PAGE_SIZE = 10;
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

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
  return 'Não foi possível carregar o relatório de pagamentos.';
}

function csvCell(value: string | number): string {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
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
  const [userId, setUserId] = useState<number | null>(initialFilters.userId ?? null);
  const [clientName, setClientName] = useState(initialFilters.clientName ?? '');
  const [categoryIds, setCategoryIds] = useState<number[]>(
    initialFilters.categoryIds ?? [],
  );
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

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
      setFeedback(errorMessage(reason));
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
      ['ID', 'Pago em', 'Colaborador', 'Categoria', 'Cliente', 'Observações', 'Valor'],
      ...report.items.map((item) => [
        item.id,
        formatDate(item.paidAt),
        item.userName,
        item.categoryName,
        item.clientName,
        item.remarks,
        item.amount.toFixed(2).replace('.', ','),
      ]),
      ['', '', '', '', '', 'Total', report.totalAmount.toFixed(2).replace('.', ',')],
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `relatorio-rd-${report.period.startDate}-${report.period.endDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
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
            <p>Consulta nativa das RDs com pagamento concluído.</p>
          </div>
          <Link className={styles.backLink} href="/logistics/expenses/admin">
            Voltar à gestão
          </Link>
        </section>

        <section className={styles.notice}>
          <strong>0042a em paridade controlada.</strong>
          <span>
            A edição administrativa continua no PHP até o 0042b; este corte não
            redireciona ainda o detalharRD.php.
          </span>
        </section>

        <form className={styles.filters} onSubmit={submit}>
          <label>
            De
            <input
              type="date"
              value={startDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setStartDate(event.target.value)}
            />
          </label>
          <label>
            Até
            <input
              type="date"
              value={endDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setEndDate(event.target.value)}
            />
          </label>
          <label>
            Cliente
            <select
              value={clientName}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setClientName(event.target.value)}
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
                  setUserId(event.target.value ? Number(event.target.value) : null)
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
                  Array.from(event.currentTarget.selectedOptions).map((option) =>
                    Number(option.value),
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
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.length === 0 ? (
                    <tr>
                      <td className={styles.emptyCell} colSpan={8}>
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
                          className={visible ? undefined : styles.printOnlyRow}
                          key={item.id}
                        >
                          <td>{index + 1}</td>
                          <td>{item.id}</td>
                          <td>{formatDate(item.paidAt)}</td>
                          <td>{item.userName}</td>
                          <td>{item.categoryName}</td>
                          <td>{item.clientName}</td>
                          <td>{item.remarks || '—'}</td>
                          <td>{currency.format(item.amount)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={7}>Total geral</th>
                    <th>{currency.format(report.totalAmount)}</th>
                  </tr>
                </tfoot>
              </table>
            </div>

            {totalPages > 1 ? (
              <nav className={styles.pagination} aria-label="Paginação do relatório">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                    setPage((current) => Math.min(totalPages, current + 1))
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
    </main>
  );
}

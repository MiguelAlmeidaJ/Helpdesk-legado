import { AppPermission, type CurrentUserResponse } from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../../../modules/access/server/current-user';
import { ExpensePaidReportScreen } from '../../../../../modules/logistics/components/expense-paid-report-screen';
import type { ExpensePaidReportFilters } from '../../../../../modules/logistics/api/expense-paid-report-api';

export const metadata: Metadata = {
  title: 'Relatório de RDs pagas · Helpdesk',
  description: 'Relatório administrativo de despesas pagas',
};

type SearchValue = string | string[] | undefined;

function first(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function categoryIds(value: SearchValue): number[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(raw.flatMap((entry) => entry.split(','))
    .map((entry) => positiveInteger(entry.trim()))
    .filter((entry): entry is number => entry !== undefined))];
}

function legacyCategoryValues(
  params: Record<string, SearchValue>,
): string[] {
  return Object.entries(params)
    .filter(
      ([key]) =>
        key === 'category_id' ||
        key === 'category_id[]' ||
        /^category_id\[\d+\]$/.test(key),
    )
    .flatMap(([, value]) =>
      Array.isArray(value) ? value : value ? [value] : [],
    );
}

function canRead(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.LogisticsExpensesAdminRead,
  );
}

export default async function ExpensePaidReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const currentUser = await requireAuthenticatedUser(
    '/logistics/expenses/admin/report',
  );
  if (!canRead(currentUser)) redirect('/logistics/expenses');

  const params = await searchParams;
  const initialFilters: ExpensePaidReportFilters = {
    startDate: first(params.startDate) ?? first(params.date_start),
    endDate: first(params.endDate) ?? first(params.date_end),
    userId: positiveInteger(first(params.userId) ?? first(params.user_id)),
    clientName: first(params.clientName) ?? first(params.cliente_nome),
    categoryIds: categoryIds(
      params.categoryId ?? legacyCategoryValues(params),
    ),
  };

  return (
    <ExpensePaidReportScreen
      currentUser={currentUser}
      initialFilters={initialFilters}
    />
  );
}

import {
  AppPermission,
  type CurrentUserResponse,
  type LogisticsExpenseAdminStatus,
} from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { ExpenseAdminDashboardScreen } from '../../../../modules/logistics/components/expense-admin-dashboard-screen';

export const metadata: Metadata = {
  title: 'Gestão de RDs · Helpdesk',
  description: 'Painel administrativo de despesas e reembolsos',
};

type SearchValue = string | string[] | undefined;

function first(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function dateValue(value: string | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? value
    : undefined;
}

function statusValue(
  value: string | undefined,
): LogisticsExpenseAdminStatus | undefined {
  const parsed = Number(value);
  return parsed === 1 || parsed === 2 || parsed === 4 ? parsed : undefined;
}

function canReadAdminDashboard(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.LogisticsExpensesAdminRead,
  );
}

export default async function ExpenseAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const currentUser = await requireAuthenticatedUser(
    '/logistics/expenses/admin',
  );

  if (!canReadAdminDashboard(currentUser)) {
    redirect('/logistics/expenses');
  }

  const params = await searchParams;
  const initialFilters = {
    startDate: dateValue(first(params.startDate) ?? first(params.data_inicio)),
    endDate: dateValue(first(params.endDate) ?? first(params.data_fim)),
    status: statusValue(first(params.status)),
  };

  return (
    <ExpenseAdminDashboardScreen
      currentUser={currentUser}
      initialFilters={initialFilters}
    />
  );
}

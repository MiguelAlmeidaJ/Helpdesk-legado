import { AppPermission, type CurrentUserResponse } from '@helpdesk/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '../../../../../modules/access/server/current-user';
import type { ExpenseComparisonFilters } from '../../../../../modules/logistics/api/expense-comparison-api';
import { ExpenseComparisonScreen } from '../../../../../modules/logistics/components/expense-comparison-screen';

export const metadata: Metadata = {
  title: 'Análise comparativa de RDs · Helpdesk',
  description: 'Comparação administrativa de despesas pagas entre períodos',
};

type SearchValue = string | string[] | undefined;

function first(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function percentAlert(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1000
    ? parsed
    : undefined;
}

function canRead(user: CurrentUserResponse): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === AppPermission.LogisticsExpensesAdminRead,
  );
}

export default async function ExpenseComparisonPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const currentUser = await requireAuthenticatedUser(
    '/logistics/expenses/admin/analysis',
  );
  if (!canRead(currentUser)) redirect('/logistics/expenses');

  const params = await searchParams;
  const initialFilters: ExpenseComparisonFilters = {
    period1Start: first(params.period1Start) ?? first(params.date_start_1),
    period1End: first(params.period1End) ?? first(params.date_end_1),
    period2Start: first(params.period2Start) ?? first(params.date_start_2),
    period2End: first(params.period2End) ?? first(params.date_end_2),
    percentAlert: percentAlert(
      first(params.percentAlert) ?? first(params.percent_alert),
    ),
  };

  return (
    <ExpenseComparisonScreen
      currentUser={currentUser}
      initialFilters={initialFilters}
    />
  );
}

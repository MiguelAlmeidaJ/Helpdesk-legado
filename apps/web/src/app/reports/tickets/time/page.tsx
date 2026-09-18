import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { TicketAnalyticsScreen } from '../../../../modules/reports/components/ticket-analytics-screen';

export default async function TimePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const currentUser = await requireAuthenticatedUser('/reports/tickets/time');
  const query = await searchParams;
  const filters = Object.fromEntries(['source', 'startDate', 'endDate', 'clientId', 'locationId', 'technicianId', 'level'].flatMap(key => typeof query[key] === 'string' ? [[key, query[key]]] : []));
  return <TicketAnalyticsScreen key={JSON.stringify(filters)} currentUser={currentUser} mode="time" initialFilters={filters} />;
}

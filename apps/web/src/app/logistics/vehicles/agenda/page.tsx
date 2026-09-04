import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { VehicleAgendaScreen } from '../../../../modules/logistics/components/vehicle-agenda-screen';

export const metadata: Metadata = {
  title: 'Agenda de Veículos · Helpdesk',
  description: 'Agenda operacional de veículos da Logística',
};

function queryInteger(
  value: string | string[] | undefined,
  minimum: number,
  maximum: number,
): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return undefined;

  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : undefined;
}

export default async function VehicleAgendaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await requireAuthenticatedUser(
    '/logistics/vehicles/agenda',
  );
  const query = await searchParams;

  return (
    <VehicleAgendaScreen
      autoPrint={(Array.isArray(query.print) ? query.print[0] : query.print) === '1'}
      currentUser={currentUser}
      initialMonth={queryInteger(query.month, 1, 12)}
      initialYear={queryInteger(query.year, 2000, 2100)}
    />
  );
}

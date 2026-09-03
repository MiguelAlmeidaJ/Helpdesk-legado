import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '../../../../modules/access/server/current-user';
import { VehicleAgendaScreen } from '../../../../modules/logistics/components/vehicle-agenda-screen';

export const metadata: Metadata = {
  title: 'Agenda de Veículos · Helpdesk',
  description: 'Agenda operacional de veículos da Logística',
};

export default async function VehicleAgendaPage() {
  const currentUser = await requireAuthenticatedUser(
    '/logistics/vehicles/agenda',
  );

  return <VehicleAgendaScreen currentUser={currentUser} />;
}

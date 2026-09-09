import type { ReactNode } from 'react';
import { TicketTypeNavigationDock } from '../../modules/tickets/components/ticket-type-navigation-dock';

export default function TicketsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <TicketTypeNavigationDock />
    </>
  );
}

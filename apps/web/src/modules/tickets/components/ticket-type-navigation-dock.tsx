"use client";

import type { TicketTypeDescriptor, TicketTypeKey } from '@helpdesk/contracts';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchTicketTypes } from '../api/modular-ticket-create-api';
import styles from './ticket-type-navigation-dock.module.css';

const LIST_ROUTES: Record<TicketTypeKey, string> = {
  atendimento: '/tickets',
  devops: '/tickets/devops',
  marketing: '/tickets/marketing',
};

function currentType(pathname: string): TicketTypeKey | null {
  if (pathname.startsWith('/tickets/devops')) return 'devops';
  if (pathname.startsWith('/tickets/marketing')) return 'marketing';
  if (pathname === '/tickets/new') return null;
  if (pathname.startsWith('/tickets')) return 'atendimento';
  return null;
}

export function TicketTypeNavigationDock() {
  const pathname = usePathname();
  const [types, setTypes] = useState<TicketTypeDescriptor[]>([]);

  useEffect(() => {
    let active = true;
    fetchTicketTypes()
      .then((response) => {
        if (active) setTypes(response.ticketTypes);
      })
      .catch(() => {
        if (active) setTypes([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const activeType = useMemo(() => currentType(pathname), [pathname]);

  if (types.length < 2) return null;

  return (
    <nav className={styles.dock} aria-label="Tipos de ticket">
      <span className={styles.label}>Tickets</span>
      {types.map((type) => (
        <Link
          className={styles.link}
          data-active={activeType === type.key}
          href={LIST_ROUTES[type.key]}
          key={type.key}
        >
          {type.label}
        </Link>
      ))}
    </nav>
  );
}

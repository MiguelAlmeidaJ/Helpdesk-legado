"use client";

import type { TicketTypeDescriptor, TicketTypeKey } from '@helpdesk/contracts';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchTicketTypes } from '../api/modular-ticket-create-api';

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
  const showDock = !pathname.startsWith('/tickets/recurrences');

  useEffect(() => {
    if (!showDock) return;

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
  }, [showDock]);

  const activeType = useMemo(() => currentType(pathname), [pathname]);

  if (!showDock || types.length < 2) return null;

  return (
    <nav
      aria-label="Tipos de ticket"
      className="fixed bottom-4 left-1/2 z-[90] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1.5 overflow-x-auto rounded-full border border-app-border bg-app-surface/95 p-1.5 shadow-xl shadow-slate-950/15 backdrop-blur-xl dark:shadow-black/30 max-[620px]:justify-start"
    >
      <span className="pl-2.5 pr-2 text-[0.74rem] font-bold uppercase tracking-[0.04em] text-app-muted max-[620px]:hidden">
        Tickets
      </span>
      {types.map((type) => (
        <Link
          className="inline-flex min-h-[34px] items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-[0.84rem] font-semibold text-app-text no-underline transition hover:bg-app-surface-hover data-[active=true]:bg-app-brand data-[active=true]:text-white"
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

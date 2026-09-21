"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchAppNavigation } from './navigation-api';
import {
  APP_NAVIGATION_SECTIONS,
  APP_NAVIGATION_STANDALONE,
  DASHBOARD_NAVIGATION_ITEM,
  type NavigationItem,
  type NavigationSection,
} from './navigation';

const FALLBACK_SECTIONS: NavigationSection[] = [
  {
    id: 'primary',
    label: 'Principal',
    shortLabel: 'IN',
    items: [DASHBOARD_NAVIGATION_ITEM],
  },
  ...APP_NAVIGATION_SECTIONS,
  {
    id: 'standalone',
    label: 'Outros',
    shortLabel: 'OU',
    items: APP_NAVIGATION_STANDALONE,
  },
];

function isActive(pathname: string, item: NavigationItem): boolean {
  if (!item.href) {
    return false;
  }

  if (item.href === '/painel') {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavigationLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavigationItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const base =
    'flex min-h-9 items-center justify-between gap-2.5 rounded-lg px-[9px] py-[7px] no-underline';

  if (item.status === 'planned' || !item.href) {
    return (
      <span className={`${base} cursor-not-allowed text-app-subtle`} aria-disabled="true">
        <span className="min-w-0 text-xs">{item.label}</span>
        <small className="shrink-0 rounded-full bg-app-surface-muted px-[5px] py-0.5 text-[8px] font-black uppercase tracking-[0.03em] text-app-subtle">
          Em migração
        </small>
      </span>
    );
  }

  const active = isActive(pathname, item);

  return (
    <Link
      className={[
        base,
        'transition-colors',
        active
          ? 'bg-app-brand-soft font-extrabold text-app-brand'
          : 'text-app-text-soft hover:bg-app-surface-hover',
      ].join(' ')}
      href={item.href}
      onClick={onNavigate}
    >
      <span className="min-w-0 text-xs">{item.label}</span>
      <small className="shrink-0 rounded-full bg-app-success-soft px-[5px] py-0.5 text-[8px] font-black uppercase tracking-[0.03em] text-app-success">
        Disponível
      </small>
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [navigationSections, setNavigationSections] =
    useState<NavigationSection[]>(FALLBACK_SECTIONS);

  useEffect(() => {
    const controller = new AbortController();

    fetchAppNavigation(controller.signal)
      .then((response) => setNavigationSections(response.sections))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        // Keep the static navigation as a safe fallback when the API is unavailable.
      });

    return () => controller.abort();
  }, []);

  const { primaryItems, regularSections, standaloneItems } = useMemo(() => {
    const primary = navigationSections.find((section) => section.id === 'primary');
    const standalone = navigationSections.find(
      (section) => section.id === 'standalone',
    );

    return {
      primaryItems: primary?.items ?? [],
      regularSections: navigationSections.filter(
        (section) => section.id !== 'primary' && section.id !== 'standalone',
      ),
      standaloneItems: standalone?.items ?? [],
    };
  }, [navigationSections]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        aria-controls="app-navigation-sidebar"
        aria-expanded={open}
        aria-label="Abrir menu principal"
        className="grid size-10 shrink-0 cursor-pointer content-center gap-1 rounded-[9px] border border-app-border bg-app-surface px-2.5 transition-colors hover:bg-app-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-brand"
        onClick={() => {
          setOpenSectionId(null);
          setOpen(true);
        }}
        type="button"
      >
        <span className="h-0.5 w-full rounded-full bg-app-text-soft" />
        <span className="h-0.5 w-full rounded-full bg-app-text-soft" />
        <span className="h-0.5 w-full rounded-full bg-app-text-soft" />
      </button>

      {open ? (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-[79] cursor-default border-0 bg-slate-950/45"
          onClick={() => setOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        aria-hidden={!open}
        className={[
          'fixed left-0 top-0 z-[80] grid h-dvh max-h-dvh w-[min(380px,calc(100vw-28px))] grid-rows-[auto_minmax(0,1fr)] border-r border-app-border bg-app-surface shadow-[18px_0_55px_rgba(15,23,42,0.18)] transition-transform duration-200 motion-reduce:transition-none dark:shadow-[18px_0_55px_rgba(0,0,0,0.4)]',
          open ? 'visible translate-x-0' : 'invisible -translate-x-[102%]',
        ].join(' ')}
        id="app-navigation-sidebar"
      >
        <div className="flex min-h-[70px] items-center justify-between gap-4 border-b border-app-border-soft px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              alt="Helpdesk"
              className="h-auto w-[150px] dark:brightness-0 dark:invert"
              height={600}
              priority
              src="/branding/helpdesk-logo.png"
              width={1200}
            />
            <span className="text-[9px] font-black uppercase tracking-[0.11em] text-app-muted">
              Navegação
            </span>
          </div>
          <button
            aria-label="Fechar menu"
            className="grid size-[38px] cursor-pointer place-items-center rounded-[9px] border border-app-border bg-app-surface text-2xl leading-none text-app-muted transition-colors hover:bg-app-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-brand"
            onClick={() => setOpen(false)}
            type="button"
          >
            ×
          </button>
        </div>

        <nav
          className="h-full min-h-0 overflow-y-auto overscroll-contain px-3 pb-7 pt-3"
          aria-label="Menu principal"
        >
          {primaryItems.length > 0 ? (
            <div className="mb-2.5 border-b border-app-border-soft pb-2.5">
              {primaryItems.map((item) => (
                <NavigationLink
                  item={item}
                  key={item.id}
                  onNavigate={() => setOpen(false)}
                  pathname={pathname}
                />
              ))}
            </div>
          ) : null}

          {regularSections.map((section) => (
            <details
              className="group mb-1.5"
              key={section.id}
              onToggle={(event) => {
                const sectionIsOpen = event.currentTarget.open;
                setOpenSectionId((current) => {
                  if (sectionIsOpen) return section.id;
                  return current === section.id ? null : current;
                });
              }}
              open={openSectionId === section.id}
            >
              <summary className="grid min-h-11 cursor-pointer list-none grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-[9px] rounded-[9px] px-2 py-1.5 text-app-text-soft transition-colors hover:bg-app-surface-hover">
                <span className="grid size-[30px] place-items-center rounded-lg bg-app-surface-muted text-[9px] font-black tracking-[0.04em] text-app-muted">
                  {section.shortLabel}
                </span>
                <strong className="text-[13px]">{section.label}</strong>
                <span className="text-[13px] text-app-subtle transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none">
                  ⌄
                </span>
              </summary>
              <div className="mb-2 ml-[39px] mt-[3px] grid gap-[3px]">
                {section.items.map((item) => (
                  <NavigationLink
                    item={item}
                    key={item.id}
                    onNavigate={() => setOpen(false)}
                    pathname={pathname}
                  />
                ))}
              </div>
            </details>
          ))}

          {standaloneItems.length > 0 ? (
            <div className="mt-2.5 grid gap-[3px] border-t border-app-border-soft pt-2.5">
              {standaloneItems.map((item) => (
                <NavigationLink
                  item={item}
                  key={item.id}
                  onNavigate={() => setOpen(false)}
                  pathname={pathname}
                />
              ))}
            </div>
          ) : null}
        </nav>
      </aside>
    </>
  );
}

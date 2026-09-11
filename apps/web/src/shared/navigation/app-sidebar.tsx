"use client";

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
import styles from './app-sidebar.module.css';

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

  if (item.href === '/dashboard') {
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
  if (item.status === 'planned' || !item.href) {
    return (
      <span className={styles.plannedItem} aria-disabled="true">
        <span>{item.label}</span>
        <small>Em migração</small>
      </span>
    );
  }

  return (
    <Link
      className={styles.item}
      data-active={isActive(pathname, item)}
      href={item.href}
      onClick={onNavigate}
    >
      <span>{item.label}</span>
      <small>Disponível</small>
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
        className={styles.trigger}
        onClick={() => setOpen(true)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      {open ? (
        <button
          aria-label="Fechar menu"
          className={styles.backdrop}
          onClick={() => setOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        aria-hidden={!open}
        className={styles.sidebar}
        data-open={open}
        id="app-navigation-sidebar"
      >
        <div className={styles.sidebarHeader}>
          <div>
            <span>Helpdesk</span>
            <strong>Navegação</strong>
          </div>
          <button
            aria-label="Fechar menu"
            className={styles.close}
            onClick={() => setOpen(false)}
            type="button"
          >
            ×
          </button>
        </div>

        <nav className={styles.navigation} aria-label="Menu principal">
          {primaryItems.length > 0 ? (
            <div className={styles.dashboardLink}>
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
            <details className={styles.section} key={section.id} open>
              <summary>
                <span className={styles.sectionIcon}>{section.shortLabel}</span>
                <strong>{section.label}</strong>
                <span className={styles.sectionChevron}>⌄</span>
              </summary>
              <div className={styles.sectionItems}>
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
            <div className={styles.standalone}>
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

import { DEFAULT_NAVIGATION, type NavigationIconName } from '@helpdesk/contracts';

export type NavigationItemStatus = 'available' | 'planned';

export interface NavigationItem {
  id: string;
  label: string;
  icon: NavigationIconName | null;
  href?: string;
  status: NavigationItemStatus;
}

export interface NavigationSection {
  id: string;
  label: string;
  shortLabel: string;
  icon: NavigationIconName | null;
  items: NavigationItem[];
}

function items(sectionSlug: string): NavigationItem[] {
  const section = DEFAULT_NAVIGATION.find(({ slug }) => slug === sectionSlug);

  if (!section) {
    throw new Error(`Unknown default navigation section: ${sectionSlug}`);
  }

  return section.items.map(
    ({ slug, label, icon, href, status }) => ({
      id: slug,
      label,
      icon: icon ?? section.icon ?? null,
      href,
      status,
    }),
  );
}

export const DASHBOARD_NAVIGATION_ITEM: NavigationItem = items('primary')[0]!;

export const APP_NAVIGATION_SECTIONS: NavigationSection[] = DEFAULT_NAVIGATION
  .filter((section) => !['primary', 'administration'].includes(section.slug))
  .map((section) => ({
    id: section.slug,
    label: section.label,
    shortLabel: section.shortLabel,
    icon: section.icon,
    items: items(section.slug),
  }));

export function navigationTotals() {
  const items = [
    DASHBOARD_NAVIGATION_ITEM,
    ...APP_NAVIGATION_SECTIONS.flatMap((section) => section.items),
  ];

  return {
    total: items.length,
    available: items.filter((item) => item.status === 'available').length,
    planned: items.filter((item) => item.status === 'planned').length,
  };
}

import { DEFAULT_NAVIGATION } from '@helpdesk/contracts';

export type NavigationItemStatus = 'available' | 'planned';

export interface NavigationItem {
  id: string;
  label: string;
  href?: string;
  status: NavigationItemStatus;
}

export interface NavigationSection {
  id: string;
  label: string;
  shortLabel: string;
  items: NavigationItem[];
}

function items(sectionSlug: string): NavigationItem[] {
  return DEFAULT_NAVIGATION.find((section) => section.slug === sectionSlug)!.items.map(
    ({ slug, label, href, status }) => ({ id: slug, label, href, status }),
  );
}

export const DASHBOARD_NAVIGATION_ITEM: NavigationItem = items('primary')[0]!;

export const APP_NAVIGATION_SECTIONS: NavigationSection[] = DEFAULT_NAVIGATION
  .filter((section) => !['primary', 'standalone', 'administration'].includes(section.slug))
  .map((section) => ({
    id: section.slug,
    label: section.label,
    shortLabel: section.shortLabel,
    items: items(section.slug),
  }));

export const APP_NAVIGATION_STANDALONE: NavigationItem[] = items('standalone');

export function navigationTotals() {
  const items = [
    DASHBOARD_NAVIGATION_ITEM,
    ...APP_NAVIGATION_SECTIONS.flatMap((section) => section.items),
    ...APP_NAVIGATION_STANDALONE,
  ];

  return {
    total: items.length,
    available: items.filter((item) => item.status === 'available').length,
    planned: items.filter((item) => item.status === 'planned').length,
  };
}

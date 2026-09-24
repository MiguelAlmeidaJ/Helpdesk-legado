export type AppNavigationStatus = 'available' | 'planned';

export const NAVIGATION_ICON_NAMES = [
  'home',
  'headset',
  'code',
  'megaphone',
  'truck',
  'chart',
  'database',
  'radio',
  'wallet',
  'settings',
  'shield',
  'users',
  'menu',
  'wrench',
  'clock',
  'file',
  'folder',
  'building',
  'list',
  'grid',
] as const;

export type NavigationIconName = (typeof NAVIGATION_ICON_NAMES)[number];

export interface AppNavigationItem {
  id: string;
  label: string;
  icon: NavigationIconName | null;
  href?: string;
  status: AppNavigationStatus;
}

export interface AppNavigationSection {
  id: string;
  label: string;
  shortLabel: string;
  icon: NavigationIconName | null;
  items: AppNavigationItem[];
}

export interface AppNavigationResponse {
  sections: AppNavigationSection[];
}

export interface NavigationVisibilityCondition {
  anyPermissions: string[];
  allPermissions: string[];
  anyRoles: string[];
}

export interface NavigationAdminItem {
  id: number;
  sectionId: number;
  slug: string;
  label: string;
  icon: NavigationIconName | null;
  href: string | null;
  status: AppNavigationStatus;
  visibilityCondition: NavigationVisibilityCondition | null;
  sortOrder: number;
  active: boolean;
}

export interface NavigationAdminSection {
  id: number;
  slug: string;
  label: string;
  shortLabel: string | null;
  icon: NavigationIconName | null;
  sortOrder: number;
  active: boolean;
  items: NavigationAdminItem[];
}

export interface NavigationAdminResponse {
  sections: NavigationAdminSection[];
}

export interface NavigationAdminSectionInput {
  slug: string;
  label: string;
  shortLabel: string | null;
  icon?: NavigationIconName | null;
  sortOrder: number;
  active: boolean;
}

export interface NavigationAdminItemInput {
  sectionId: number;
  slug: string;
  label: string;
  icon?: NavigationIconName | null;
  href: string | null;
  status: AppNavigationStatus;
  visibilityCondition: NavigationVisibilityCondition | null;
  sortOrder: number;
  active: boolean;
}

export interface NavigationAdminMutationResponse {
  id: number;
}

export type AppNavigationStatus = 'available' | 'planned';

export interface AppNavigationItem {
  id: string;
  label: string;
  href?: string;
  status: AppNavigationStatus;
}

export interface AppNavigationSection {
  id: string;
  label: string;
  shortLabel: string;
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
  sortOrder: number;
  active: boolean;
}

export interface NavigationAdminItemInput {
  sectionId: number;
  slug: string;
  label: string;
  href: string | null;
  status: AppNavigationStatus;
  visibilityCondition: NavigationVisibilityCondition | null;
  sortOrder: number;
  active: boolean;
}

export interface NavigationAdminMutationResponse {
  id: number;
}

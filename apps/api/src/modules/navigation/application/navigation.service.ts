import { Inject, Injectable } from '@nestjs/common';
import {
  AppPermission,
  type AppNavigationItem,
  type AppNavigationResponse,
  type AppNavigationStatus,
  type UserRole,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';

type NavigationRow = {
  section_slug: string;
  section_label: string;
  short_label: string | null;
  item_slug: string;
  item_label: string;
  href: string | null;
  status: string;
  visibility_condition: string | null;
};

type VisibilityCondition = {
  anyPermissions: string[];
  allPermissions: string[];
  anyRoles: string[];
};

const NAVIGATION_QUERY = `
SELECT
  s.slug AS section_slug,
  s.label AS section_label,
  s.short_label,
  i.slug AS item_slug,
  i.label AS item_label,
  i.href,
  i.status,
  i.visibility_condition
FROM navigation_sections s
INNER JOIN navigation_items i ON i.section_id = s.id
WHERE s.is_active = 1
  AND i.is_active = 1
ORDER BY s.sort_order ASC, s.id ASC, i.sort_order ASC, i.id ASC
`;

function status(value: string): AppNavigationStatus {
  return value === 'available' ? 'available' : 'planned';
}

function stringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== 'string' || !item.trim())
  ) {
    return undefined;
  }
  return value.map((item) => item.trim());
}

function parseCondition(raw: string | null): VisibilityCondition | null | false {
  if (!raw?.trim()) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

    const input = value as Record<string, unknown>;
    const known = new Set(['anyPermissions', 'allPermissions', 'anyRoles']);
    const keys = Object.keys(input);
    if (keys.length === 0 || keys.some((key) => !known.has(key))) return false;

    const anyPermissions = stringArray(input.anyPermissions);
    const allPermissions = stringArray(input.allPermissions);
    const anyRoles = stringArray(input.anyRoles);

    if (
      (input.anyPermissions !== undefined && anyPermissions === undefined) ||
      (input.allPermissions !== undefined && allPermissions === undefined) ||
      (input.anyRoles !== undefined && anyRoles === undefined)
    ) {
      return false;
    }

    return {
      anyPermissions: anyPermissions ?? [],
      allPermissions: allPermissions ?? [],
      anyRoles: anyRoles ?? [],
    };
  } catch {
    return false;
  }
}

function isVisible(row: NavigationRow, user: AuthenticatedUser): boolean {
  const permissions = new Set(user.grants.map((grant) => grant.permission));
  if (permissions.has(AppPermission.SystemAdmin)) return true;

  const condition = parseCondition(row.visibility_condition);
  if (condition === false) return false;
  if (condition === null) return true;

  const roles = new Set<UserRole>(user.roleAssignments.map((assignment) => assignment.role));

  if (
    condition.anyPermissions.length &&
    !condition.anyPermissions.some((permission) => permissions.has(permission as AppPermission))
  ) {
    return false;
  }

  if (
    condition.allPermissions.length &&
    !condition.allPermissions.every((permission) => permissions.has(permission as AppPermission))
  ) {
    return false;
  }

  if (
    condition.anyRoles.length &&
    !condition.anyRoles.some((role) => roles.has(role as UserRole))
  ) {
    return false;
  }

  return true;
}

@Injectable()
export class NavigationService {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly nivel3: Nivel3DatabaseClient,
  ) {}

  async forUser(user: AuthenticatedUser): Promise<AppNavigationResponse> {
    const rows = await this.nivel3.$queryRawUnsafe<NavigationRow[]>(NAVIGATION_QUERY);
    const sections = new Map<
      string,
      { id: string; label: string; shortLabel: string; items: AppNavigationItem[] }
    >();

    for (const row of rows) {
      if (!isVisible(row, user)) continue;

      let section = sections.get(row.section_slug);
      if (!section) {
        section = {
          id: row.section_slug,
          label: row.section_label,
          shortLabel: row.short_label?.trim() || row.section_label.slice(0, 2).toUpperCase(),
          items: [],
        };
        sections.set(row.section_slug, section);
      }

      section.items.push({
        id: row.item_slug,
        label: row.item_label,
        ...(row.href ? { href: row.href } : {}),
        status: status(row.status),
      });
    }

    return { sections: [...sections.values()] };
  }
}

import { Injectable } from '@nestjs/common';
import {
  AppPermission,
  DEFAULT_NAVIGATION,
  type AppNavigationItem,
  type AppNavigationResponse,
  type UserRole,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';

type VisibilityCondition = {
  anyPermissions?: string[];
  allPermissions?: string[];
  anyRoles?: string[];
};

function isVisible(
  condition: VisibilityCondition | undefined,
  user: AuthenticatedUser,
): boolean {
  const permissions = new Set(user.grants.map((grant) => grant.permission));
  if (permissions.has(AppPermission.SystemAdmin)) return true;
  if (!condition) return true;

  const roles = new Set<UserRole>(
    user.roleAssignments.map((assignment) => assignment.role),
  );

  if (
    condition.anyPermissions?.length &&
    !condition.anyPermissions.some((permission) =>
      permissions.has(permission as AppPermission),
    )
  ) {
    return false;
  }

  if (
    condition.allPermissions?.length &&
    !condition.allPermissions.every((permission) =>
      permissions.has(permission as AppPermission),
    )
  ) {
    return false;
  }

  if (
    condition.anyRoles?.length &&
    !condition.anyRoles.some((role) => roles.has(role as UserRole))
  ) {
    return false;
  }

  return true;
}

@Injectable()
export class NavigationService {
  async forUser(user: AuthenticatedUser): Promise<AppNavigationResponse> {
    const sections = DEFAULT_NAVIGATION.map((section) => {
      const items = section.items
        .filter((item) => isVisible(item.visibilityCondition, user))
        .map<AppNavigationItem>((item) => ({
          id: item.slug,
          label: item.label,
          icon: item.icon ?? section.icon,
          ...(item.href ? { href: item.href } : {}),
          status: item.status,
        }));

      return {
        id: section.slug,
        label: section.label,
        shortLabel: section.shortLabel,
        icon: section.icon,
        items,
      };
    }).filter((section) => section.items.length > 0);

    return { sections };
  }
}

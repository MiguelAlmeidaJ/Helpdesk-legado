import { Injectable } from '@nestjs/common';
import {
  AppPermission,
  PermissionScope,
  type PermissionGrant,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../domain/authenticated-user';
import type { LegacyUserSession } from '../domain/legacy-user-session';
import { RbacAccessRepository } from '../infrastructure/rbac-access.repository';
import { translateLegacySession } from './legacy-permission-translator';
import { translateRbacAccess } from './rbac-permission-translator';

function scopeRank(scope: PermissionScope): number {
  if (scope === PermissionScope.All) return 3;
  if (scope === PermissionScope.Sector) return 2;
  return 1;
}

function mergeGrants(
  base: readonly PermissionGrant[],
  extra: readonly PermissionGrant[],
): PermissionGrant[] {
  const merged = new Map<AppPermission, PermissionGrant>();

  for (const grant of [...base, ...extra]) {
    const current = merged.get(grant.permission);
    if (!current || scopeRank(grant.scope) > scopeRank(current.scope)) {
      merged.set(grant.permission, grant);
    }
  }

  return [...merged.values()];
}

@Injectable()
export class ResolveAuthenticatedUser {
  constructor(private readonly rbac: RbacAccessRepository) {}

  async execute(
    legacySession: LegacyUserSession,
  ): Promise<AuthenticatedUser | null> {
    const snapshot = await this.rbac.findByUserId(legacySession.id);

    if (!snapshot || !snapshot.active) {
      return null;
    }

    if (!snapshot.hasAssignments) {
      const legacy = translateLegacySession(legacySession);
      if (snapshot.onCallAreas.length === 0) {
        return legacy;
      }

      const temporary = translateRbacAccess(legacySession, snapshot);
      return {
        ...legacy,
        grants: mergeGrants(legacy.grants, temporary.grants),
      };
    }

    const user = translateRbacAccess(legacySession, snapshot);

    // Radio still exists only in the positional legacy permission string.
    // Keep this single compatibility grant until it receives an RBAC slug.
    const legacy = translateLegacySession(legacySession);
    const radioGrant = legacy.grants.find(
      (grant) => grant.permission === AppPermission.TicketsRadio,
    );

    if (radioGrant) {
      return {
        ...user,
        grants: [...user.grants, radioGrant],
      };
    }

    return user;
  }
}

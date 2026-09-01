import { Injectable } from '@nestjs/common';
import { AppPermission } from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../domain/authenticated-user';
import type { LegacyUserSession } from '../domain/legacy-user-session';
import { RbacAccessRepository } from '../infrastructure/rbac-access.repository';
import { translateLegacySession } from './legacy-permission-translator';
import { translateRbacAccess } from './rbac-permission-translator';

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
      return translateLegacySession(legacySession);
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

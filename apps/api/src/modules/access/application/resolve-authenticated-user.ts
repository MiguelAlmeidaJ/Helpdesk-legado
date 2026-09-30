import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../domain/authenticated-user';
import type { LegacyUserSession } from '../domain/legacy-user-session';
import { RbacAccessRepository } from '../infrastructure/rbac-access.repository';
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

    return translateRbacAccess(legacySession, snapshot);
  }
}

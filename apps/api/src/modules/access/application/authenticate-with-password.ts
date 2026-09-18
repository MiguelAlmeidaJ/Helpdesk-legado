import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { AuthenticatedUser } from '../domain/authenticated-user';
import { AccessIdentityRepository } from '../infrastructure/access-identity.repository';
import { ApiSessionRepository } from '../infrastructure/api-session.repository';
import { ResolveAuthenticatedUser } from './resolve-authenticated-user';

function normalizePhpBcryptHash(hash: string): string | null {
  if (hash.startsWith('$2y$')) {
    return `$2b$${hash.slice(4)}`;
  }

  if (/^\$2[ab]\$/.test(hash)) {
    return hash;
  }

  return null;
}

@Injectable()
export class AuthenticateWithPassword {
  constructor(
    private readonly identities: AccessIdentityRepository,
    private readonly sessions: ApiSessionRepository,
    private readonly resolveUser: ResolveAuthenticatedUser,
  ) {}

  async execute(
    login: string,
    password: string,
  ): Promise<{
    user: AuthenticatedUser;
    token: string;
    expiresAt: Date;
  } | null> {
    const credential = await this.identities.findActiveByLogin(login);

    if (!credential) {
      return null;
    }

    const bcryptHash = normalizePhpBcryptHash(credential.passwordHash);

    if (!bcryptHash) {
      return null;
    }

    const valid = await bcrypt.compare(password, bcryptHash);

    if (!valid) {
      return null;
    }

    const user = await this.resolveUser.execute(credential.session);

    if (!user) {
      return null;
    }

    const session = await this.sessions.create(user.id);
    await this.identities.recordLogin(user.id);

    return {
      user,
      token: session.token,
      expiresAt: session.expiresAt,
    };
  }
}

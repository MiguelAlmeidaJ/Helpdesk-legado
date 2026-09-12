import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AccessIdentityRepository } from '../infrastructure/access-identity.repository';
import { ApiSessionRepository } from '../infrastructure/api-session.repository';

function normalizePhpBcryptHash(hash: string): string | null {
  if (hash.startsWith('$2y$')) return `$2b$${hash.slice(4)}`;
  return /^\$2[ab]\$/.test(hash) ? hash : null;
}

@Injectable()
export class ChangePassword {
  constructor(
    private readonly identities: AccessIdentityRepository,
    private readonly sessions: ApiSessionRepository,
  ) {}

  async execute(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    const credential = await this.identities.findActiveById(userId);
    const currentHash = credential
      ? normalizePhpBcryptHash(credential.passwordHash)
      : null;

    if (!currentHash || !(await bcrypt.compare(currentPassword, currentHash))) {
      return false;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.identities.updatePassword(userId, passwordHash);
    await this.sessions.revokeAllForUser(userId, 'password_changed');
    return true;
  }
}

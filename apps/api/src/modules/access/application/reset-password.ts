import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { AccessIdentityRepository } from '../infrastructure/access-identity.repository';
import { ApiSessionRepository } from '../infrastructure/api-session.repository';
import { PasswordRecoveryRepository } from '../infrastructure/password-recovery.repository';

@Injectable()
export class ResetPassword {
  constructor(
    private readonly identities: AccessIdentityRepository,
    private readonly recoveries: PasswordRecoveryRepository,
    private readonly sessions: ApiSessionRepository,
  ) {}

  async execute(token: string, password: string): Promise<boolean> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const recovery = await this.recoveries.findValid(tokenHash);

    if (!recovery?.email) {
      return false;
    }

    const identity = await this.identities.findActiveByEmail(recovery.email);

    if (!identity) {
      await this.recoveries.consume(recovery.id);
      return false;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await this.identities.updatePassword(identity.id, passwordHash);
    await this.sessions.revokeAllForUser(identity.id, 'password_reset');
    await this.recoveries.consume(recovery.id);
    return true;
  }
}

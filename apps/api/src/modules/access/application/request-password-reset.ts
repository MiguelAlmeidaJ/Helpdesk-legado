import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { AccessIdentityRepository } from '../infrastructure/access-identity.repository';
import { PasswordRecoveryRepository } from '../infrastructure/password-recovery.repository';
import { PasswordResetMailer } from '../infrastructure/password-reset-mailer';

@Injectable()
export class RequestPasswordReset {
  constructor(
    private readonly identities: AccessIdentityRepository,
    private readonly recoveries: PasswordRecoveryRepository,
    private readonly mailer: PasswordResetMailer,
  ) {}

  async execute(email: string): Promise<void> {
    const identity = await this.identities.findActiveByEmail(email);

    if (!identity) {
      return;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.recoveries.replace(identity.email, tokenHash, expiresAt);
    const sent = await this.mailer.send(identity.email, token);

    if (!sent) {
      const recovery = await this.recoveries.findValid(tokenHash);
      if (recovery) {
        await this.recoveries.consume(recovery.id);
      }
    }
  }
}
